// JavaScript port of engine/conditions.py. Same three-valued logic: true, false or null (unknown).
// scripts/parity.mjs checks that this engine gives exactly the same output as the Python one.

export const UNKNOWN = null

export function leaves(cond) {
  if ('fact' in cond) return [cond]
  return (cond.all || cond.any || []).flatMap(leaves)
}

const has = (memory, fact) => Object.prototype.hasOwnProperty.call(memory, fact)

function compare(actual, op, expected) {
  switch (op) {
    case '==': return deepEqual(actual, expected)
    case '!=': return !deepEqual(actual, expected)
    case '>': return comparable(actual, expected) && actual > expected
    case '>=': return comparable(actual, expected) && actual >= expected
    case '<': return comparable(actual, expected) && actual < expected
    case '<=': return comparable(actual, expected) && actual <= expected
    case 'in': return Array.isArray(expected) && expected.some(v => deepEqual(v, actual))
    case 'not_in': return Array.isArray(expected) && !expected.some(v => deepEqual(v, actual))
    case 'contains': return Array.isArray(actual) ? actual.some(v => deepEqual(v, expected))
      : typeof actual === 'string' && actual.includes(expected)
    default: throw new Error(`Unknown operator ${op}`)
  }
}

// Python raises TypeError (treated as false) when comparing, e.g., None or a string with a number.
function comparable(a, b) {
  return a !== null && a !== undefined && typeof a === typeof b && typeof a !== 'boolean'
}

function deepEqual(a, b) {
  if (a === b) return true
  if (a === undefined) a = null
  return JSON.stringify(a) === JSON.stringify(b)
}

export function evaluate(cond, memory, unknownFacts = new Set(), closedWorld = false) {
  if ('fact' in cond) {
    const { fact } = cond
    if (!has(memory, fact) || unknownFacts.has(fact)) {
      return closedWorld ? compare(null, cond.op, cond.value) : UNKNOWN
    }
    return compare(memory[fact], cond.op, cond.value)
  }
  if (cond.all) {
    const r = cond.all.map(c => evaluate(c, memory, unknownFacts, closedWorld))
    if (r.includes(false)) return false
    return r.every(x => x === true) ? true : UNKNOWN
  }
  if (cond.any) {
    const r = cond.any.map(c => evaluate(c, memory, unknownFacts, closedWorld))
    if (r.includes(true)) return true
    return r.every(x => x === false) ? false : UNKNOWN
  }
  throw new Error('Malformed condition')
}

export function firstFalseLeaf(cond, memory, unknownFacts = new Set()) {
  if ('fact' in cond) return evaluate(cond, memory, unknownFacts) === false ? cond : null
  for (const child of cond.all || cond.any || []) {
    if (evaluate(child, memory, unknownFacts) === false) return firstFalseLeaf(child, memory, unknownFacts)
  }
  return null
}

// Python repr(), so the explanation trace reads the same in both engines.
export function pyRepr(v) {
  if (v === true) return 'True'
  if (v === false) return 'False'
  if (v === null || v === undefined) return 'None'
  if (typeof v === 'string') return v.includes("'") && !v.includes('"') ? `"${v}"` : `'${v.replace(/'/g, "\\'")}'`
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`
  return String(v)
}

export function describe(leaf, memory) {
  let text = `${leaf.fact} ${leaf.op} ${pyRepr(leaf.value)}`
  if (memory && has(memory, leaf.fact)) text += ` (is ${pyRepr(memory[leaf.fact])})`
  return text
}

export { has }
