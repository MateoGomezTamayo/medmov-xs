// Last decision per case, kept in this browser only (a convenience; nothing depends on it).
const KEY = 'medmov.decisions'

export function lastDecisions() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

export function saveDecision(caseId, decision) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...lastDecisions(), [caseId]: decision })) } catch { /* storage blocked */ }
}
