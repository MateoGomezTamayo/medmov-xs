import { LEVEL, DECISION, C } from '../theme'

// Like Ayudas Colombia's PriorityBadge, for alert levels and decisions.
export function LevelBadge({ level }) {
  const s = LEVEL[level] || { label: level, bg: C.cardAlt, fg: C.muted }
  return (
    <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
      {s.label.toUpperCase()}
    </span>
  )
}

export function DecisionPill({ decision }) {
  const s = DECISION[decision]
  if (!s) return <span style={{ color: C.faint, fontSize: 12 }}>Not evaluated yet</span>
  return (
    <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{s.label}</span>
  )
}
