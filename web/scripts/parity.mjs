// Runs the JavaScript engine on every case with its scripted answers and compares the result with the
// Python engine's output in output/<case>.json. Any difference fails: both engines must reason the same.
//   node scripts/parity.mjs        (regenerate the Python outputs first: python main.py <case> --answers ...)
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSession, UNKNOWN_ANSWER } from '../src/engine/engine.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
const kb = { rules: read('knowledge/rules.json'), questions: read('knowledge/questions.json'), policy: read('knowledge/decision_policy.json') }

let failures = 0
for (const file of readdirSync(join(ROOT, 'cases')).filter(f => f.endsWith('.json'))) {
  const kase = read(`cases/${file}`)
  const answers = read(`cases/answers/${file}`)
  const session = createSession(kb, kase)
  let step = session.next()
  while (step.type === 'question') step = session.answer(step.question.fact in answers ? answers[step.question.fact] : UNKNOWN_ANSWER)
  const js = step.output
  const py = read(`output/${kase.case_id}.json`)
  const a = JSON.stringify(js, null, 1), b = JSON.stringify(py, null, 1)
  if (a === b) {
    console.log(`OK    ${kase.case_id}: ${js.decision}, fired ${js.fired_rules.join(' ')}`)
  } else {
    failures++
    console.log(`DIFF  ${kase.case_id}`)
    const la = a.split('\n'), lb = b.split('\n')
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      if (la[i] !== lb[i]) { console.log(`  js: ${la[i]}\n  py: ${lb[i]}`); break }
    }
  }
}
process.exit(failures ? 1 : 0)
