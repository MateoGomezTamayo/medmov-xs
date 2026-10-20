import { C, card, font } from '../theme'
import { KB } from '../data/knowledge'
import { LevelBadge } from '../components/Badges'
import { leaves, pyRepr } from '../engine/conditions'

const cond = c => leaves(c).map(l => `${l.fact} ${l.op} ${pyRepr(l.value).replace('True', 'true').replace('False', 'false')}`).join('  AND  ')

export default function Rules() {
  const rules = [...KB.rules.rules].sort((a, b) => b.priority - a.priority)
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 110px', fontFamily: font }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Knowledge base</h1>
      <p style={{ color: C.muted, fontSize: 14, margin: '6px 0 16px', maxWidth: 640 }}>
        {rules.length} rules from <code>knowledge/rules.json</code>, in the order the engine tries them (priority, highest first).
        Thresholds are starting values to review with a mobility expert.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rules.map(r => (
          <div key={r.id} style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: C.faint, fontSize: 12, width: 32 }}>{r.id}</span>
              <span style={{ fontWeight: 700 }}>{r.name}</span>
              <span style={{ color: C.faint, fontSize: 12 }}>{r.goal} · priority {r.priority}</span>
              <span style={{ marginLeft: 'auto' }}>{r.then.alert ? <LevelBadge level={r.then.alert.level} /> : <span style={{ fontSize: 11, color: C.blueLight, fontWeight: 700 }}>DERIVED</span>}</span>
            </div>
            <div style={{ fontSize: 12, color: C.blueLight, overflowWrap: 'anywhere', fontFamily: 'ui-monospace,Consolas,monospace' }}>IF {cond(r.when)}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{r.because}</div>
            {r.then.assert && <div style={{ fontSize: 12, color: C.faint }}>asserts {Object.entries(r.then.assert).map(([k, v]) => `${k} = ${v}`).join(', ')}</div>}
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 800, margin: '24px 0 8px' }}>Decision policy</h2>
      <div style={{ ...card, overflow: 'hidden' }}>
        {KB.policy.rules.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13, flexWrap: 'wrap' }}>
            <span style={{ color: C.faint, width: 28 }}>{p.id}</span>
            <span style={{ flex: '1 1 260px', color: C.muted }}>{p.reason}</span>
            <span style={{ fontWeight: 700 }}>{p.decision.replace(/_/g, ' ')}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, padding: '10px 14px', fontSize: 13 }}>
          <span style={{ color: C.faint, width: 28 }}>—</span>
          <span style={{ flex: 1, color: C.muted }}>{KB.policy.default.reason}</span>
          <span style={{ fontWeight: 700 }}>{KB.policy.default.decision}</span>
        </div>
      </div>
    </div>
  )
}
