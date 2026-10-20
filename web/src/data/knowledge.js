// The same JSON files the Python engine reads (see vite.config.js aliases).
import rules from '@knowledge/rules.json'
import questions from '@knowledge/questions.json'
import policy from '@knowledge/decision_policy.json'
import estadio from '@cases/estadio_partido.json'
import obras from '@cases/obras_avenida80.json'
import alumbrados from '@cases/alumbrados_centro.json'

export const KB = { rules, questions, policy }

// Map positions are approximate, for display only.
export const CASES = [
  { ...estadio, title: 'Match day at the stadium', position: [6.2475, -75.5905] },
  { ...obras, title: 'Metro de la 80 works', position: [6.2405, -75.5965] },
  { ...alumbrados, title: 'Alumbrados downtown', position: [6.2462, -75.5712] },
]

export const findCase = id => CASES.find(c => c.case_id === id)

export const FACT_LABELS = Object.fromEntries(questions.questions.map(q => [q.fact, q.text]))
