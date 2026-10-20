"""Three-valued evaluation of rule conditions.

A condition is either a leaf {"fact", "op", "value"} or a group {"all": [...]} / {"any": [...]}.
evaluate() returns True, False or None (unknown: a fact it needs is missing).
"""

UNKNOWN = None

# Facts the engine computes itself; rules may read them but nobody is asked for them.
DERIVED_FACTS = {"alerts.high_count", "alerts.medium_count", "alerts.low_count", "alerts.total", "rules.fired"}


def leaves(cond):
    """All leaf comparisons of a condition, in order."""
    if "fact" in cond:
        return [cond]
    out = []
    for child in cond.get("all", cond.get("any", [])):
        out.extend(leaves(child))
    return out


def compare(actual, op, expected):
    try:
        if op == "==":
            return actual == expected
        if op == "!=":
            return actual != expected
        if op == ">":
            return actual > expected
        if op == ">=":
            return actual >= expected
        if op == "<":
            return actual < expected
        if op == "<=":
            return actual <= expected
        if op == "in":
            return actual in expected
        if op == "not_in":
            return actual not in expected
        if op == "contains":
            return expected in actual
    except TypeError:
        # A missing value under the closed-world policy (None) never satisfies an order comparison.
        return False
    raise ValueError(f"Unknown operator {op!r}")


def evaluate(cond, memory, unknown_facts=(), closed_world=False):
    """True / False / None. With closed_world=True a missing fact counts as None (not true) instead of unknown."""
    if "fact" in cond:
        fact = cond["fact"]
        if fact not in memory or fact in unknown_facts:
            if not closed_world:
                return UNKNOWN
            return compare(None, cond["op"], cond["value"])
        return compare(memory[fact], cond["op"], cond["value"])
    if "all" in cond:
        results = [evaluate(c, memory, unknown_facts, closed_world) for c in cond["all"]]
        if False in results:
            return False
        return True if all(r is True for r in results) else UNKNOWN
    if "any" in cond:
        results = [evaluate(c, memory, unknown_facts, closed_world) for c in cond["any"]]
        if True in results:
            return True
        return False if all(r is False for r in results) else UNKNOWN
    raise ValueError(f"Malformed condition: {cond}")


def first_false_leaf(cond, memory, unknown_facts=()):
    """The leaf that makes a False condition false (for "why not" explanations)."""
    if "fact" in cond:
        return cond if evaluate(cond, memory, unknown_facts) is False else None
    for child in cond.get("all", cond.get("any", [])):
        if evaluate(child, memory, unknown_facts) is False:
            return first_false_leaf(child, memory, unknown_facts)
    return None


def describe(leaf, memory=None):
    text = f"{leaf['fact']} {leaf['op']} {leaf['value']!r}"
    if memory is not None and leaf["fact"] in memory:
        text += f" (is {memory[leaf['fact']]!r})"
    return text
