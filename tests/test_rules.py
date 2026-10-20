"""One test per rule: a fact set that fires it and one that does not."""
import pytest

from engine import Engine, load_knowledge
from engine.questions import NoAsker
from tests.conftest import ROOT

RULES, QUESTIONS, POLICY = load_knowledge(ROOT)

# rule id -> (facts that fire it, the one change that stops it)
CASES = {
    "R01": ({"detour.passes_school_zone": True, "time.school_peak": True, "detour.heavy_vehicles": True}, {"time.school_peak": False}),
    "R02": ({"detour.bike_lane": "shared", "detour.flow_increase_pct": 40}, {"detour.flow_increase_pct": 30}),
    "R03": ({"intersection.high_crash_history": True, "detour.flow_increase_pct": 25}, {"intersection.high_crash_history": False}),
    "R04": ({"closure.removes_transit_stop": True, "transit.alt_stop_within_300m": False}, {"transit.alt_stop_within_300m": True}),
    "R05": ({"transit.added_minutes": 12}, {"transit.added_minutes": 10}),
    "R06": ({"event.massive": True, "works.parallel_corridor_active": True}, {"works.parallel_corridor_active": False}),
    "R07": ({"event.exit_crowd": 25000, "closure.metro_access_on_street": True}, {"event.exit_crowd": 15000}),
    "R08": ({"detour.removes_loading_zones": True, "time.business_hours": True}, {"time.business_hours": False}),
    "R09": ({"detour.blocks_hospital_access": True, "hospital.alternate_route": False}, {"hospital.alternate_route": True}),
    "R10": ({"detour.residential_night_minutes": 90}, {"detour.residential_night_minutes": 45}),
    # Derived rules: R02 + R06 give two HIGH alerts.
    "R11": ({"detour.bike_lane": "shared", "detour.flow_increase_pct": 40, "mitigation.available": True}, {"mitigation.available": False}),
    "R12": ({"detour.bike_lane": "shared", "detour.flow_increase_pct": 40, "event.massive": True,
             "works.parallel_corridor_active": True, "detour.single_hotspot": True}, {"detour.single_hotspot": False}),
}


def run(facts):
    return Engine(RULES, QUESTIONS, POLICY, NoAsker()).run({"case_id": "t", "facts": facts})


def test_every_rule_has_a_test():
    assert {r["id"] for r in RULES["rules"]} == set(CASES)


@pytest.mark.parametrize("rule_id", sorted(CASES))
def test_rule_fires(rule_id):
    facts, _ = CASES[rule_id]
    assert rule_id in run(facts)["fired_rules"]


@pytest.mark.parametrize("rule_id", sorted(CASES))
def test_rule_does_not_fire(rule_id):
    facts, change = CASES[rule_id]
    out = run({**facts, **change})
    assert rule_id not in out["fired_rules"]
    assert any(line.startswith(f"{rule_id} not fired") for line in out["trace"])


def test_priority_order():
    """R09 (priority 95) fires before R08 (55) when both are ready."""
    out = run({"detour.blocks_hospital_access": True, "hospital.alternate_route": False,
               "detour.removes_loading_zones": True, "time.business_hours": True})
    assert out["fired_rules"].index("R09") < out["fired_rules"].index("R08")


def test_decisions():
    assert run({})["decision"] == "APPROVE"
    assert run({"transit.added_minutes": 12})["decision"] == "APPROVE_WITH_CONDITIONS"
    assert run({"detour.bike_lane": "shared", "detour.flow_increase_pct": 40, "mitigation.available": False})["decision"] == "REJECT"
    assert run({"detour.blocks_hospital_access": True, "hospital.alternate_route": False, "mitigation.available": True})["decision"] == "REJECT"
