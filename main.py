"""MedMov-XS command line.

  python main.py cases/estadio_partido.json                     # interactive: the engine asks what it needs
  python main.py cases/estadio_partido.json --answers cases/answers/estadio_partido.json
  python main.py cases/estadio_partido.json --no-ask            # never ask; missing facts stay unknown
  python main.py --validate                                     # only validate the knowledge base and all cases
"""
import argparse
import json
import sys
from pathlib import Path

from engine import ValidationError, load_json, load_knowledge, run_case, validate_all
from engine.questions import ConsoleAsker, NoAsker, ScriptedAsker

ROOT = Path(__file__).resolve().parent
ICON = {"HIGH": "[HIGH]  ", "MEDIUM": "[MEDIUM]", "LOW": "[LOW]   "}


def print_report(out):
    print("\n" + "=" * 72)
    print(f"Case: {out['case_id']}")
    print(out["description"])
    print("=" * 72)
    print(f"DECISION: {out['decision']}  ({out['decision_rule']}: {out['decision_reason']})")
    if out["alerts"]:
        print("\nAlerts:")
        for a in out["alerts"]:
            where = f" at {a['where']}" if a.get("where") else ""
            print(f"  {ICON[a['level']]} {a['code']}{where}  <- {a['rule']}")
            print(f"            because: {a['because']}")
    else:
        print("\nNo alerts.")
    if out["recommendations"]:
        print("\nRecommendations / conditions:")
        for r in out["recommendations"]:
            print(f"  - {r}")
    if out["questions_asked"]:
        print("\nQuestions asked:")
        for q in out["questions_asked"]:
            print(f"  - {q['question']} -> {q['answer']}")
    if out["open_questions"]:
        print("\nOpen questions (unknown facts that left rules undecided):")
        for f in out["open_questions"]:
            print(f"  - {f}")
    print("\nExplanation trace:")
    for line in out["trace"]:
        print(f"  {line}")


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="MedMov-XS: expert system for urban mobility conflicts in Medellín")
    p.add_argument("case", nargs="?", help="path to a case JSON file")
    p.add_argument("--answers", help="JSON file with scripted answers to the engine's questions")
    p.add_argument("--no-ask", action="store_true", help="do not ask; missing facts stay unknown")
    p.add_argument("--out", default=str(ROOT / "output"), help="folder for the output JSON")
    p.add_argument("--validate", action="store_true", help="only validate the knowledge base and every case")
    args = p.parse_args(argv)

    knowledge = load_knowledge(ROOT)
    try:
        if args.validate:
            validate_all(*knowledge)
            for case_path in sorted((ROOT / "cases").glob("*.json")):
                validate_all(*knowledge, load_json(case_path), case_path.name)
            print("OK: knowledge base and all cases are valid.")
            return 0
        if not args.case:
            p.error("give a case file, or --validate")
        case = load_json(args.case)
        if args.answers:
            asker = ScriptedAsker(load_json(args.answers))
        elif args.no_ask:
            asker = NoAsker()
        else:
            asker = ConsoleAsker()
        out = run_case(case, asker, knowledge)
    except ValidationError as err:
        print("Validation failed:", file=sys.stderr)
        for e in err.errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    print_report(out)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{out['case_id']}.json"
    out_file.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved: {out_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
