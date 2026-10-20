"""Explanation module: why a rule fired, and why another did not."""
from .conditions import describe, evaluate, first_false_leaf, leaves


def why_fired(rule, memory):
    reasons = ", ".join(describe(leaf, memory) for leaf in leaves(rule["when"]))
    return f"{rule['id']} fired ({rule['name']}): {reasons}"


def why_not(rule, memory, unknown_facts):
    status = evaluate(rule["when"], memory, unknown_facts)
    if status is False:
        leaf = first_false_leaf(rule["when"], memory, unknown_facts)
        return f"{rule['id']} not fired: {describe(leaf, memory)} is false"
    missing = [leaf["fact"] for leaf in leaves(rule["when"]) if leaf["fact"] not in memory or leaf["fact"] in unknown_facts]
    return f"{rule['id']} undecided: missing {', '.join(missing)}"
