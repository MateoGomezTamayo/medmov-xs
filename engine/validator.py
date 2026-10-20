"""Validates the JSON files before any reasoning happens.

1. Schema validation of rules, questions, decision policy and the case file.
2. Knowledge-base consistency:
   - unique rule ids;
   - every fact a rule reads can be asked, asserted by another rule, or is derived by the engine;
   - no two rules with the same conditions assert opposite values;
   - no rule chain loops back on itself;
   - the decision policy only references rules that exist.
3. Case facts: values match the type of their question.
"""
import json
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from .conditions import DERIVED_FACTS, leaves

SCHEMAS = Path(__file__).resolve().parent.parent / "schemas"


class ValidationError(Exception):
    def __init__(self, errors):
        self.errors = errors
        super().__init__("\n".join(errors))


def _registry():
    resources = []
    for path in SCHEMAS.glob("*.schema.json"):
        schema = json.loads(path.read_text(encoding="utf-8"))
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


def schema_errors(document, schema_file, label):
    schema = json.loads((SCHEMAS / schema_file).read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, registry=_registry())
    out = []
    for err in sorted(validator.iter_errors(document), key=lambda e: list(e.absolute_path)):
        where = "/".join(str(p) for p in err.absolute_path) or "(root)"
        out.append(f"{label}: {where}: {err.message}")
    return out


def knowledge_errors(rules_doc, questions_doc, policy_doc):
    errors = []
    rules = rules_doc["rules"]
    questions = {q["fact"]: q for q in questions_doc["questions"]}

    ids = [r["id"] for r in rules]
    for rid in sorted({i for i in ids if ids.count(i) > 1}):
        errors.append(f"rules.json: duplicate rule id {rid}")

    asserted = {}
    for r in rules:
        for fact in r["then"].get("assert", {}):
            asserted.setdefault(fact, []).append(r["id"])

    for r in rules:
        for leaf in leaves(r["when"]):
            fact = leaf["fact"]
            if fact not in questions and fact not in asserted and fact not in DERIVED_FACTS:
                errors.append(f"rules.json: {r['id']} reads '{fact}', which has no question, no rule asserts it and the engine does not derive it")

    # Same conditions, opposite conclusions.
    by_when = {}
    for r in rules:
        by_when.setdefault(json.dumps(r["when"], sort_keys=True), []).append(r)
    for group in by_when.values():
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                for fact, value in a["then"].get("assert", {}).items():
                    other = b["then"].get("assert", {})
                    if fact in other and other[fact] != value:
                        errors.append(f"rules.json: {a['id']} and {b['id']} have the same conditions but assert {fact} = {value!r} vs {other[fact]!r}")

    # Cycles: an edge goes from each fact a rule reads to each fact it asserts.
    graph = {}
    for r in rules:
        for leaf in leaves(r["when"]):
            graph.setdefault(leaf["fact"], set()).update(r["then"].get("assert", {}).keys())
    state = {}

    def visit(node, path):
        state[node] = "open"
        for nxt in graph.get(node, ()):
            if state.get(nxt) == "open":
                errors.append("rules.json: rule chain loops: " + " -> ".join(path + [nxt]))
            elif nxt not in state:
                visit(nxt, path + [nxt])
        state[node] = "done"

    for node in list(graph):
        if node not in state:
            visit(node, [node])

    for p in policy_doc["rules"]:
        for leaf in leaves(p["when"]):
            if leaf["fact"] == "rules.fired" and leaf["value"] not in ids:
                errors.append(f"decision_policy.json: {p['id']} references unknown rule {leaf['value']}")
    return errors


def case_errors(case_doc, questions_doc, label):
    errors = []
    questions = {q["fact"]: q for q in questions_doc["questions"]}
    for fact, value in case_doc.get("facts", {}).items():
        q = questions.get(fact)
        if not q:
            continue
        if q["type"] == "boolean" and not isinstance(value, bool):
            errors.append(f"{label}: {fact} must be true/false, got {value!r}")
        elif q["type"] == "number":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                errors.append(f"{label}: {fact} must be a number, got {value!r}")
            elif ("min" in q and value < q["min"]) or ("max" in q and value > q["max"]):
                errors.append(f"{label}: {fact} = {value} is outside [{q.get('min')}, {q.get('max')}]")
        elif q["type"] == "choice" and value not in q["options"]:
            errors.append(f"{label}: {fact} must be one of {q['options']}, got {value!r}")
    return errors


def validate_all(rules_doc, questions_doc, policy_doc, case_doc=None, case_label="case"):
    errors = []
    errors += schema_errors(rules_doc, "rule.schema.json", "rules.json")
    errors += schema_errors(questions_doc, "questions.schema.json", "questions.json")
    errors += schema_errors(policy_doc, "decision_policy.schema.json", "decision_policy.json")
    if not errors:  # consistency checks assume the shapes are right
        errors += knowledge_errors(rules_doc, questions_doc, policy_doc)
    if case_doc is not None:
        case_schema = schema_errors(case_doc, "facts.schema.json", case_label)
        errors += case_schema or case_errors(case_doc, questions_doc, case_label)
    if errors:
        raise ValidationError(errors)
