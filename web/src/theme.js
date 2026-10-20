// Palette and building blocks reused from the Ayudas Colombia interface (GitHub-dark style).
export const C = {
  dark: '#0d1117',
  card: '#161b22',
  cardAlt: '#1c2128',
  border: '#30363d',
  text: '#f0f6fc',
  muted: '#8b949e',
  faint: '#484f58',
  blue: '#1d4ed8',
  blueLight: '#58a6ff',
  green: '#16a34a',
  greenLight: '#4ade80',
  orange: '#c2410c',
  orangeLight: '#fb923c',
  red: '#dc2626',
  redLight: '#f87171',
  yellow: '#FCD116',
}

export const font = 'system-ui,-apple-system,"Segoe UI",sans-serif'

export const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }

export const LEVEL = {
  HIGH: { label: 'High', bg: 'rgba(220,38,38,0.15)', fg: C.redLight, solid: C.red },
  MEDIUM: { label: 'Medium', bg: 'rgba(251,146,60,0.15)', fg: C.orangeLight, solid: C.orange },
  LOW: { label: 'Low', bg: 'rgba(74,222,128,0.12)', fg: C.greenLight, solid: C.green },
}

export const DECISION = {
  APPROVE: { label: 'Approve', fg: C.greenLight, solid: C.green, bg: 'rgba(22,163,74,0.14)' },
  APPROVE_WITH_CONDITIONS: { label: 'Approve with conditions', fg: C.orangeLight, solid: C.orange, bg: 'rgba(194,65,12,0.16)' },
  REJECT: { label: 'Reject', fg: C.redLight, solid: C.red, bg: 'rgba(220,38,38,0.16)' },
}

export const button = (kind = 'primary') => ({
  border: kind === 'ghost' ? `1px solid ${C.border}` : 'none',
  background: kind === 'primary' ? C.blue : kind === 'danger' ? C.red : kind === 'ok' ? C.green : 'transparent',
  color: C.text,
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: font,
})
