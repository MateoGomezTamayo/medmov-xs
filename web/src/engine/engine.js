// JavaScript port of engine/inference.py + decision.py + explain.py, as a resumable session so the
// web page can stop at each question:  const s = createSession(kb, case); let step = s.next();
// while (step.type === 'question') step = s.answer(value)   ->  step.output when step.type === 'done'
import { evaluate, leaves, firstFalseLeaf, describe, pyRepr, has } from './conditions.js'

export const UNKNOWN_ANSWER = Symbol('unknown')
const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }

function whyFired(rule, memory) {
  return `${rule.id} fired (${rule.name}): ${leaves(rule.when).map(l => describe(l, memory)).join(', ')}`
}

function whyNot(rule, memory, unknownFacts) {
  if (evaluate(rule.when, memory, unknownFacts) === false) {
    return `${rule.id} not fired: ${describe(firstFalseLeaf(rule.when, memory, unknownFacts), memory)} is false`
  }
  const missing = leaves(rule.when).map(l => l.fact).filter(f => !has(memory, f) || unknownFacts.has(f))
  return `${rule.id} undecided: missing ${missing.join(', ')}`
}

export function decide(policy, memory) {
  for (const r of policy.rules) {
    if (evaluate(r.when, memory, new Set(), true) === true) return { decision: r.decision, rule: r.id, reason: r.reason }
  }
  return { decision: policy.default.decision, rule: 'default', reason: policy.default.reason }
}

export function createSession({ rules: rulesDoc, questions: questionsDoc, policy }, kase) {
  const rules = rulesDoc.rules
  const Q = Object.fromEntries(questionsDoc.questions.map(q => [q.fact, q]))
  const assertedBy = {}
  for (const r of rules) for (const f of Object.keys(r.then.assert || {})) (assertedBy[f] ||= []).push(r)

  const memory = { ...kase.facts }
  const unknownFacts = new Set()
  const fired = [], alerts = [], recommendations = [], trace = [], asked = []
  let pending = null

  const refresh = () => {
    const levels = alerts.map(a => a.level)
    memory['alerts.high_count'] = levels.filter(l => l === 'HIGH').length
    memory['alerts.medium_count'] = levels.filter(l => l === 'MEDIUM').length
    memory['alerts.low_count'] = levels.filter(l => l === 'LOW').length
    memory['alerts.total'] = levels.length
    memory['rules.fired'] = [...fired]
  }
  const status = r => evaluate(r.when, memory, unknownFacts)

  const fire = rule => {
    fired.push(rule.id)
    const then = rule.then
    if (then.alert) {
      const evidence = {}
      for (const l of leaves(rule.when)) {
        if (has(memory, l.fact) && !l.fact.startsWith('alerts.')) evidence[l.fact] = memory[l.fact]
      }
      const alert = { ...then.alert, rule: rule.id, because: rule.because, evidence }
      if (has(memory, 'detour.hotspot')) alert.where = memory['detour.hotspot']
      alerts.push(alert)
    }
    trace.push(whyFired(rule, memory))
    for (const [f, v] of Object.entries(then.assert || {})) {
      memory[f] = v
      trace.push(`  ${rule.id} asserted ${f} = ${pyRepr(v)}`)
    }
    for (const rec of then.recommend || []) if (!recommendations.includes(rec)) recommendations.push(rec)
    refresh()
  }

  const forward = () => {
    for (;;) {
      const agenda = rules.filter(r => !fired.includes(r.id) && status(r) === true)
        .sort((a, b) => (b.priority - a.priority) || (leaves(b.when).length - leaves(a.when).length))
      if (!agenda.length) return
      fire(agenda[0])
    }
  }

  const askable = (cond, visiting) => {
    if (evaluate(cond, memory, unknownFacts) !== null) return null
    if ('fact' in cond) {
      const f = cond.fact
      if (has(memory, f) || unknownFacts.has(f)) return null
      if (Q[f]) return f
      for (const r of assertedBy[f] || []) {
        if (!fired.includes(r.id) && !visiting.has(r.id)) {
          const found = askable(r.when, new Set([...visiting, r.id]))
          if (found) return found
        }
      }
      return null
    }
    for (const child of cond.all || cond.any || []) {
      const found = askable(child, visiting)
      if (found) return found
    }
    return null
  }

  const nextQuestion = () => {
    const undecided = rules.filter(r => !fired.includes(r.id) && status(r) === null)
      .sort((a, b) => b.priority - a.priority)
    for (const r of undecided) {
      const f = askable(r.when, new Set([r.id]))
      if (f) return [f, r]
    }
    return [null, null]
  }

  const finalize = () => {
    const open = []
    for (const r of rules) {
      if (fired.includes(r.id)) continue
      trace.push(whyNot(r, memory, unknownFacts))
      if (status(r) === null) {
        for (const l of leaves(r.when)) {
          if ((!has(memory, l.fact) || unknownFacts.has(l.fact)) && !open.includes(l.fact)) open.push(l.fact)
        }
      }
    }
    const d = decide(policy, memory)
    return {
      case_id: kase.case_id,
      description: kase.description || '',
      decision: d.decision,
      decision_rule: d.rule,
      decision_reason: d.reason,
      alerts: [...alerts].sort((a, b) => ORDER[a.level] - ORDER[b.level]),
      recommendations,
      questions_asked: asked,
      open_questions: open,
      fired_rules: fired,
      trace,
    }
  }

  refresh()

  const next = () => {
    forward()
    const [fact, rule] = nextQuestion()
    if (fact) {
      pending = { fact, rule }
      return { type: 'question', question: Q[fact], rule }
    }
    return { type: 'done', output: finalize() }
  }

  const answer = value => {
    if (!pending) throw new Error('No question pending')
    const { fact, rule } = pending
    pending = null
    asked.push({ fact, question: Q[fact].text, answer: value === UNKNOWN_ANSWER ? 'unknown' : value })
    if (value === UNKNOWN_ANSWER) {
      unknownFacts.add(fact)
      trace.push(`Asked ${fact} for ${rule.id}: unknown`)
    } else {
      memory[fact] = value
      trace.push(`Asked ${fact} for ${rule.id}: ${pyRepr(value)}`)
    }
    return next()
  }

  return { next, answer, trace, alerts, fired, memory }
}
