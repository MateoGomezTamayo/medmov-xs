"""Inference engine: forward chaining by priority, plus backward chaining to ask only for the facts that matter.

Loop:
  1. Forward chaining: fire the highest-priority rule whose conditions are all true; repeat until none is left.
  2. Backward chaining: take the highest-priority rule that is still undecided (some fact unknown) and look for
     the first missing fact that could settle it. If another rule could assert that fact, follow that rule's
     conditions instead. Ask the user for it.
  3. Go back to 1 until nothing can fire and no question can change the outcome.
"""
from .conditions import evaluate, leaves, describe
from .questions import UNKNOWN_ANSWER
from .decision import decide
from .explain import why_fired, why_not


class Engine:
    def __init__(self, rules_doc, questions_doc, policy_doc, asker):
        self.rules = rules_doc["rules"]
        self.questions = {q["fact"]: q for q in questions_doc["questions"]}
        self.policy = policy_doc
        self.asker = asker
        self.asserted_by = {}
        for r in self.rules:
            for fact in r["then"].get("assert", {}):
                self.asserted_by.setdefault(fact, []).append(r)

    # ---- working memory -------------------------------------------------------------
    def _refresh_derived(self):
        levels = [a["level"] for a in self.alerts]
        self.memory["alerts.high_count"] = levels.count("HIGH")
        self.memory["alerts.medium_count"] = levels.count("MEDIUM")
        self.memory["alerts.low_count"] = levels.count("LOW")
        self.memory["alerts.total"] = len(levels)
        self.memory["rules.fired"] = list(self.fired)

    def _status(self, rule):
        return evaluate(rule["when"], self.memory, self.unknown_facts)

    # ---- forward chaining -----------------------------------------------------------
    def _agenda(self):
        ready = [r for r in self.rules if r["id"] not in self.fired and self._status(r) is True]
        # Conflict resolution: higher priority first, then the more specific rule (more conditions).
        return sorted(ready, key=lambda r: (-r["priority"], -len(leaves(r["when"]))))

    def _fire(self, rule):
        self.fired.append(rule["id"])
        then = rule["then"]
        if "alert" in then:
            alert = {**then["alert"], "rule": rule["id"], "because": rule["because"],
                     "evidence": {leaf["fact"]: self.memory[leaf["fact"]] for leaf in leaves(rule["when"])
                                  if leaf["fact"] in self.memory and not leaf["fact"].startswith("alerts.")}}
            if "detour.hotspot" in self.memory:
                alert["where"] = self.memory["detour.hotspot"]
            self.alerts.append(alert)
        self.trace.append(why_fired(rule, self.memory))
        for fact, value in then.get("assert", {}).items():
            self.memory[fact] = value
            self.trace.append(f"  {rule['id']} asserted {fact} = {value!r}")
        for rec in then.get("recommend", []):
            if rec not in self.recommendations:
                self.recommendations.append(rec)
        self._refresh_derived()

    def _forward(self):
        while True:
            agenda = self._agenda()
            if not agenda:
                return
            self._fire(agenda[0])

    # ---- backward chaining ----------------------------------------------------------
    def _askable(self, cond, visiting):
        """First missing fact that could change this (still unknown) condition, or None."""
        if evaluate(cond, self.memory, self.unknown_facts) is not None:
            return None
        if "fact" in cond:
            fact = cond["fact"]
            if fact in self.memory or fact in self.unknown_facts:
                return None
            if fact in self.questions:
                return fact
            for rule in self.asserted_by.get(fact, []):  # go back to the rule that could conclude it
                if rule["id"] not in self.fired and rule["id"] not in visiting:
                    found = self._askable(rule["when"], visiting | {rule["id"]})
                    if found:
                        return found
            return None
        for child in cond.get("all", cond.get("any", [])):
            found = self._askable(child, visiting)
            if found:
                return found
        return None

    def _next_question(self):
        undecided = [r for r in self.rules if r["id"] not in self.fired and self._status(r) is None]
        for rule in sorted(undecided, key=lambda r: -r["priority"]):
            fact = self._askable(rule["when"], {rule["id"]})
            if fact:
                return fact, rule
        return None, None

    # ---- main loop ------------------------------------------------------------------
    def run(self, case):
        self.memory = dict(case["facts"])
        self.unknown_facts = set()
        self.fired, self.alerts, self.recommendations, self.trace, self.asked = [], [], [], [], []
        self._refresh_derived()

        while True:
            self._forward()
            fact, rule = self._next_question()
            if not fact:
                break
            question = self.questions[fact]
            answer = self.asker.ask(question)
            self.asked.append({"fact": fact, "question": question["text"],
                               "answer": "unknown" if answer is UNKNOWN_ANSWER else answer})
            if answer is UNKNOWN_ANSWER:
                self.unknown_facts.add(fact)
                self.trace.append(f"Asked {fact} for {rule['id']}: unknown")
            else:
                self.memory[fact] = answer
                self.trace.append(f"Asked {fact} for {rule['id']}: {answer!r}")

        # Explanations for the rules that did not fire, and facts still open.
        open_questions = []
        for rule in self.rules:
            if rule["id"] in self.fired:
                continue
            self.trace.append(why_not(rule, self.memory, self.unknown_facts))
            if self._status(rule) is None:
                for leaf in leaves(rule["when"]):
                    f = leaf["fact"]
                    if (f not in self.memory or f in self.unknown_facts) and f not in open_questions:
                        open_questions.append(f)

        decision = decide(self.policy, self.memory)
        order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        return {
            "case_id": case["case_id"],
            "description": case.get("description", ""),
            "decision": decision["decision"],
            "decision_rule": decision["rule"],
            "decision_reason": decision["reason"],
            "alerts": sorted(self.alerts, key=lambda a: order[a["level"]]),
            "recommendations": self.recommendations,
            "questions_asked": self.asked,
            "open_questions": open_questions,
            "fired_rules": self.fired,
            "trace": self.trace,
        }


__all__ = ["Engine", "describe"]
