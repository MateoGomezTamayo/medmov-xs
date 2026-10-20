# MedMov-XS

A rule-based expert system that predicts which streets and user groups a road closure or traffic diversion in **Medellín** will harm, before the change is applied, and explains why.

Everything the expert knows lives in **JSON**: rules, case facts, questions and the decision policy. The Python engine validates those files, reasons over them with forward and backward chaining, **asks the user only for the facts it needs**, and returns a decision with alerts and a full explanation trace.

**Authors:** Mateo Gómez Tamayo · Juan Camilo Fernández — Ingeniería de Sistemas, Institución Universitaria Salazar y Herrera (IUSH), Medellín.

## Quick start

```bash
pip install -r requirements.txt
python main.py --validate                                   # validate the knowledge base and all cases
python main.py cases/estadio_partido.json                   # interactive: answer the engine's questions
python main.py cases/estadio_partido.json --answers cases/answers/estadio_partido.json
python -m pytest -q                                         # 40 tests
```

Example run (match day at the Atanasio Girardot stadium):

```
? Is a Metro station entrance on the closed street?  [yes/no, ? = don't know]
> yes

DECISION: APPROVE_WITH_CONDITIONS  (D3: There are HIGH alerts, but they can be mitigated)
  [HIGH]   CYCLIST_RISK at Calle 44 with Carrera 76       <- R02
  [HIGH]   CORRIDOR_CAPACITY at Calle 44 with Carrera 76  <- R06
  [MEDIUM] STATION_CROWDING at Calle 44 with Carrera 76   <- R07
```

## Web interface

`web/` is a React + Vite page built on the Ayudas Colombia interface (same dark palette, cards, bottom navigation and Esri dark map). It reads **the same JSON files** as the Python engine, runs a JavaScript port of the engine in the browser and asks its questions with Yes / No / I don't know buttons.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run parity     # the JS engine must give byte-identical output to output/*.json from Python
npm run build
```

- **Cases:** a map of Medellín with the three scenarios (approximate hotspot locations) and their last decision.
- **Evaluate:** one question at a time, the rules fired so far, then the decision, alerts with evidence, conditions, open questions and the full explanation trace (downloadable as JSON).
- **New case:** start with no facts; the engine works backwards from its rules and asks only what it needs.
- **Knowledge base:** every rule in priority order and the decision policy.

## How it works

```
knowledge/rules.json ─┐
cases/<case>.json  ───┼─> validator ─> inference engine <──> question module (asks the user)
knowledge/questions ──┘                     │
                                            v
                              decision policy ─> output/<case>.json
                                                 (decision, alerts, recommendations, trace)
```

1. **Validate** (`engine/validator.py`): JSON Schemas in `schemas/`, plus knowledge-base checks — unique ids, every fact a rule reads can be asked or derived, no contradictory rules, no rule loops, case values match their question type.
2. **Forward chaining** (`engine/inference.py`): fire the highest-priority rule whose conditions are all true (ties: the more specific rule); fired rules add alerts and may assert new facts that unlock other rules.
3. **Backward chaining**: for the highest-priority rule still undecided, find the missing fact that could settle it — following other rules that could assert it — and ask for it (`engine/questions.py`). "I don't know" (`?`) is stored as unknown; the rule stays undecided and the fact is reported as an open question.
4. **Decide** (`engine/decision.py`): `knowledge/decision_policy.json` maps alerts to APPROVE, APPROVE_WITH_CONDITIONS or REJECT.
5. **Explain** (`engine/explain.py`): every fired rule with the facts that made it true, and every rule that did not fire with the condition that failed.

## Repository layout

| Path | Content |
| --- | --- |
| `knowledge/rules.json` | 12 IF-THEN rules (R01-R12), each with priority, alert level and a written justification |
| `knowledge/questions.json` | How to ask for each fact (boolean, number, choice) |
| `knowledge/decision_policy.json` | Ordered policy that turns alerts into a decision |
| `schemas/` | JSON Schemas for every file type |
| `cases/` | Three Medellín scenarios + scripted answers in `cases/answers/` |
| `engine/` | Validator, inference, questions, decision, explanation |
| `output/` | Engine output for each case (JSON) |
| `tests/` | Scenario, per-rule and validator tests |

## Rules

| ID | Goal | IF | THEN |
| --- | --- | --- | --- |
| R01 | Pedestrians | detour passes a school zone AND school peak AND heavy vehicles | HIGH: school safety |
| R02 | Cyclists | bike lane without separation AND flow increase > 30% | HIGH: cyclist risk |
| R03 | Road safety | crash-prone intersection AND flow increase > 20% | HIGH: critical intersection |
| R04 | Public transit | transit stop removed AND no alternative within 300 m | HIGH: transit access lost |
| R05 | Public transit | bus routes delayed > 10 min | MEDIUM: transit delay |
| R06 | Capacity | massive stadium event AND works on a parallel corridor | HIGH: corridor capacity |
| R07 | Pedestrians | exit crowd > 20,000 AND Metro entrance on the closed street | MEDIUM: station crowding |
| R08 | Commerce | loading zones removed during business hours | MEDIUM: retail access |
| R09 | Emergency | hospital access blocked AND no alternate route | HIGH: emergency access |
| R10 | Residents | night through-traffic on residential streets > 60 min | LOW: noise |
| R11 | Derived | ≥ 1 HIGH alert AND mitigation available | assert `mitigation.possible` |
| R12 | Derived | ≥ 2 HIGH alerts AND single hotspot | assert `intersection.critical` |

Thresholds are starting values to be reviewed with a mobility expert; changing them only means editing `rules.json`.

## Test scenarios

| Case | Question asked | Rules fired | Decision |
| --- | --- | --- | --- |
| `estadio_partido` — match day, Carrera 70 closed | Metro entrance on the closed street? (yes) | R02, R06, R07, R11 | APPROVE WITH CONDITIONS |
| `obras_avenida80` — Metro de la 80 works | Heavy vehicles on the detour? (yes) | R01, R04, R05, R11 | APPROVE WITH CONDITIONS |
| `alumbrados_centro` — Alumbrados downtown | Alternate route to the hospital? (no) | R08, R09 | REJECT |

Case facts are illustrative inputs for testing the reasoning, not measured traffic data.

## Add a rule

1. Add it to `knowledge/rules.json` (conditions with `all` / `any`, operators `== != > >= < <= in not_in contains`).
2. If it reads a new fact, add a question for it in `knowledge/questions.json`.
3. Run `python main.py --validate` and add a fire / no-fire pair in `tests/test_rules.py`.

## Data sources to consult

MEData (Medellín open data portal) for road crash and mobility datasets, the Secretaría de Movilidad de Medellín, and the Metro, Metroplús and bike-lane network maps.
