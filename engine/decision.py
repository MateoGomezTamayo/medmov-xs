"""Turns the final working memory (alerts, asserted facts) into a decision, using decision_policy.json."""
from .conditions import evaluate


def decide(policy, memory):
    for rule in policy["rules"]:
        # Closed world: a fact nobody asserted counts as not true.
        if evaluate(rule["when"], memory, closed_world=True) is True:
            return {"decision": rule["decision"], "rule": rule["id"], "reason": rule["reason"]}
    return {"decision": policy["default"]["decision"], "rule": "default", "reason": policy["default"]["reason"]}
