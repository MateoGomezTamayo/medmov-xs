"""The three Medellín scenarios must match the expected result written in the design report (Section 8)."""
import copy

import pytest

from engine import load_json, load_knowledge, run_case
from engine.questions import NoAsker, ScriptedAsker
from tests.conftest import ROOT

EXPECTED = {
    "estadio_partido": {
        "decision": "APPROVE_WITH_CONDITIONS",
        "fired": {"R02", "R06", "R07", "R11"},
        "asked": ["closure.metro_access_on_street"],
    },
    "obras_avenida80": {
        "decision": "APPROVE_WITH_CONDITIONS",
        "fired": {"R01", "R04", "R05", "R11"},
        "asked": ["detour.heavy_vehicles"],
    },
    "alumbrados_centro": {
        "decision": "REJECT",
        "fired": {"R08", "R09"},
        "asked": ["hospital.alternate_route"],
    },
}


@pytest.mark.parametrize("case_id", EXPECTED)
def test_scenario(case_id):
    case = load_json(ROOT / "cases" / f"{case_id}.json")
    answers = load_json(ROOT / "cases" / "answers" / f"{case_id}.json")
    out = run_case(case, ScriptedAsker(answers), load_knowledge(ROOT))
    expected = EXPECTED[case_id]
    assert out["decision"] == expected["decision"]
    assert set(out["fired_rules"]) == expected["fired"]
    assert [q["fact"] for q in out["questions_asked"]] == expected["asked"]
    assert out["open_questions"] == []
    for alert in out["alerts"]:  # every alert is traceable to a rule and carries its reason
        assert alert["rule"] in expected["fired"] and alert["because"]


def test_negative_school_hours():
    """Same works, but outside school hours: R01 must not fire and the trace must say why."""
    case = copy.deepcopy(load_json(ROOT / "cases" / "obras_avenida80.json"))
    case["facts"]["time.school_peak"] = False
    out = run_case(case, ScriptedAsker({"detour.heavy_vehicles": True}), load_knowledge(ROOT))
    assert "R01" not in out["fired_rules"]
    assert any(line.startswith("R01 not fired: time.school_peak") for line in out["trace"])
    # R01 can no longer fire, so the engine has no reason to ask about heavy vehicles.
    assert out["questions_asked"] == []


def test_unknown_answer_leaves_rule_undecided():
    case = load_json(ROOT / "cases" / "alumbrados_centro.json")
    out = run_case(case, NoAsker(), load_knowledge(ROOT))
    assert "R09" not in out["fired_rules"]
    assert "hospital.alternate_route" in out["open_questions"]
    assert any(line.startswith("R09 undecided") for line in out["trace"])
