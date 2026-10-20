"""The validator must accept the real knowledge base and reject broken ones with a clear message."""
import copy
import json

import pytest

from engine import ValidationError, load_json, load_knowledge, validate_all
from engine.questions import parse_answer
from tests.conftest import ROOT

RULES, QUESTIONS, POLICY = load_knowledge(ROOT)


def errors_for(rules=None, questions=None, policy=None, case=None):
    with pytest.raises(ValidationError) as err:
        validate_all(rules or RULES, questions or QUESTIONS, policy or POLICY, case)
    return "\n".join(err.value.errors)


def test_real_knowledge_and_cases_are_valid():
    validate_all(RULES, QUESTIONS, POLICY)
    for path in (ROOT / "cases").glob("*.json"):
        validate_all(RULES, QUESTIONS, POLICY, load_json(path), path.name)


def test_schema_error_names_the_field():
    rules = copy.deepcopy(RULES)
    rules["rules"][0]["priority"] = "high"
    assert "rules/0/priority" in errors_for(rules=rules)


def test_unknown_fact_is_rejected():
    rules = copy.deepcopy(RULES)
    rules["rules"][0]["when"]["all"][0]["fact"] = "detour.made_up_fact"
    assert "detour.made_up_fact" in errors_for(rules=rules)


def test_duplicate_id_is_rejected():
    rules = copy.deepcopy(RULES)
    rules["rules"][1]["id"] = "R01"
    assert "duplicate rule id R01" in errors_for(rules=rules)


def test_contradiction_is_rejected():
    rules = copy.deepcopy(RULES)
    clone = copy.deepcopy(rules["rules"][0])
    clone["id"] = "R99"
    clone["then"]["assert"] = {"conflict.school_safety": False}
    rules["rules"].append(clone)
    assert "same conditions" in errors_for(rules=rules)


def test_cycle_is_rejected():
    rules = copy.deepcopy(RULES)
    rules["rules"].append({"id": "R98", "name": "loop back", "priority": 10,
                           "when": {"all": [{"fact": "mitigation.possible", "op": "==", "value": True}]},
                           "then": {"assert": {"mitigation.available": True}},
                           "because": "Deliberately loops back to test the validator."})
    assert "loops" in errors_for(rules=rules)


def test_bad_case_type_is_rejected():
    case = load_json(ROOT / "cases" / "estadio_partido.json")
    case["facts"]["detour.flow_increase_pct"] = "forty"
    assert "must be a number" in errors_for(case=case)


def test_answer_parsing():
    q_bool = {"fact": "x.y", "type": "boolean", "text": ""}
    assert parse_answer(q_bool, "sí") is True and parse_answer(q_bool, "no") is False
    q_num = {"fact": "x.y", "type": "number", "text": "", "min": 0, "max": 100}
    assert parse_answer(q_num, "40") == 40
    with pytest.raises(ValueError):
        parse_answer(q_num, "500")
    q_choice = {"fact": "x.y", "type": "choice", "text": "", "options": ["none", "separated", "shared"]}
    assert parse_answer(q_choice, "3") == "shared"
