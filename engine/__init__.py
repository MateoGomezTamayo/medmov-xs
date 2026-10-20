"""MedMov-XS engine: validator, inference (forward + backward chaining), questions, decision and explanation."""
import json
from pathlib import Path

from .inference import Engine
from .validator import ValidationError, validate_all

ROOT = Path(__file__).resolve().parent.parent


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_knowledge(root=ROOT):
    k = Path(root) / "knowledge"
    return load_json(k / "rules.json"), load_json(k / "questions.json"), load_json(k / "decision_policy.json")


def run_case(case, asker, knowledge=None):
    """Validate everything, then reason over one case. Returns the output dict."""
    rules, questions, policy = knowledge or load_knowledge()
    validate_all(rules, questions, policy, case, case.get("case_id", "case"))
    return Engine(rules, questions, policy, asker).run(case)


__all__ = ["Engine", "ValidationError", "validate_all", "load_json", "load_knowledge", "run_case"]
