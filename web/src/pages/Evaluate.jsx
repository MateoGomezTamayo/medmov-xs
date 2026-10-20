import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { C, card, button, DECISION, font } from '../theme'
import { KB, findCase, FACT_LABELS } from '../data/knowledge'
import { createSession, UNKNOWN_ANSWER } from '../engine/engine'
import { LevelBadge } from '../components/Badges'
import { saveDecision } from '../store'

const section = { ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }
const h2 = { fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, margin: 0 }
const show = v => (v === true ? 'Yes' : v === false ? 'No' : Array.isArray(v) ? v.join(', ') : String(v))

function NewCaseForm({ onStart }) {
  const [name, setName] = useState('')
  const [hotspot, setHotspot] = useState('')
  const input = { background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: '11px 12px', fontSize: 15, fontFamily: font, width: '100%', boxSizing: 'border-box' }
  return (
    <form style={section} onSubmit={e => {
      e.preventDefault()
      const facts = hotspot.trim() ? { 'detour.hotspot': hotspot.trim() } : {}
      onStart({ case_id: 'custom', description: name.trim() || 'New closure', location: 'Medellín', facts })
    }}>
      <h2 style={h2}>New case</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Describe the closure. You don't need to fill anything else: the engine will ask.</p>
      <label style={{ fontSize: 13, color: C.muted }}>What is closing?
        <input style={{ ...input, marginTop: 6 }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Carrera 65 closed for a concert" />
      </label>
      <label style={{ fontSize: 13, color: C.muted }}>Main detour intersection (optional)
        <input style={{ ...input, marginTop: 6 }} value={hotspot} onChange={e => setHotspot(e.target.value)} placeholder="e.g. Calle 30 with Carrera 65" />
      </label>
      <button type="submit" style={button('primary')}>Start evaluation</button>
    </form>
  )
}

function QuestionCard({ step, count, onAnswer }) {
  const q = step.question
  const [num, setNum] = useState('')
  const [err, setErr] = useState('')
  const ref = useRef(null)
  useEffect(() => { setNum(''); setErr(''); ref.current?.focus() }, [q.fact])
  const submitNumber = e => {
    e.preventDefault()
    const v = Number(String(num).replace(',', '.'))
    if (num === '' || Number.isNaN(v)) return setErr('Enter a number')
    if ((q.min !== undefined && v < q.min) || (q.max !== undefined && v > q.max)) return setErr(`Between ${q.min} and ${q.max}`)
    onAnswer(v)
  }
  return (
    <div style={{ ...section, borderColor: C.blueLight }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ ...h2, color: C.blueLight }}>Question {count}</span>
        <span style={{ fontSize: 12, color: C.faint }}>needed by {step.rule.id} · {step.rule.name}</span>
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.35 }}>{q.text}</div>
      {q.type === 'boolean' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button ref={ref} style={button('ok')} onClick={() => onAnswer(true)}>Yes</button>
          <button style={button('danger')} onClick={() => onAnswer(false)}>No</button>
        </div>
      )}
      {q.type === 'choice' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {q.options.map((o, i) => <button key={o} ref={i === 0 ? ref : null} style={{ ...button('ghost'), flex: '1 1 100px' }} onClick={() => onAnswer(o)}>{o}</button>)}
        </div>
      )}
      {q.type === 'number' && (
        <form onSubmit={submitNumber} style={{ display: 'flex', gap: 10 }}>
          <input ref={ref} inputMode="decimal" value={num} onChange={e => setNum(e.target.value)} placeholder={`${q.min ?? 0} - ${q.max ?? ''}`}
            style={{ flex: 1, minWidth: 0, background: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, padding: '12px 14px', fontSize: 16, fontFamily: font }} />
          <button type="submit" style={button('primary')}>Answer</button>
        </form>
      )}
      {err && <div style={{ color: C.redLight, fontSize: 13 }}>{err}</div>}
      <button style={{ ...button('ghost'), color: C.muted }} onClick={() => onAnswer(UNKNOWN_ANSWER)}>I don't know</button>
      <div style={{ fontSize: 12, color: C.faint }}>"I don't know" leaves the rule undecided; it shows up as an open question in the result.</div>
    </div>
  )
}

function Result({ out, onRestart }) {
  const d = DECISION[out.decision]
  const [showTrace, setShowTrace] = useState(false)
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `${out.case_id}.json` })
    a.click(); URL.revokeObjectURL(url)
  }
  return (
    <>
      <div style={{ ...section, background: d.bg, borderColor: d.solid }}>
        <span style={{ ...h2, color: d.fg }}>Decision</span>
        <div style={{ fontSize: 26, fontWeight: 800, color: d.fg }}>{d.label}</div>
        <div style={{ fontSize: 14, color: C.text }}>{out.decision_reason} <span style={{ color: C.faint }}>({out.decision_rule})</span></div>
      </div>

      <div style={section}>
        <h2 style={h2}>Alerts ({out.alerts.length})</h2>
        {!out.alerts.length && <div style={{ color: C.muted, fontSize: 14 }}>No conflicts detected.</div>}
        {out.alerts.map(a => (
          <div key={a.rule} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <LevelBadge level={a.level} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{a.code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, s => s.toUpperCase())}</span>
              <span style={{ fontSize: 12, color: C.faint, marginLeft: 'auto' }}>{a.rule}</span>
            </div>
            {a.where && <div style={{ fontSize: 13, color: C.blueLight }}>{a.where}</div>}
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45 }}>{a.because}</div>
            <div style={{ fontSize: 12, color: C.faint }}>Evidence: {Object.entries(a.evidence).map(([k, v]) => `${k} = ${show(v)}`).join(' · ')}</div>
          </div>
        ))}
      </div>

      {out.recommendations.length > 0 && (
        <div style={section}>
          <h2 style={h2}>{out.decision === 'APPROVE_WITH_CONDITIONS' ? 'Conditions' : 'Recommendations'}</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            {out.recommendations.map(r => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      {out.open_questions.length > 0 && (
        <div style={{ ...section, borderColor: C.orange }}>
          <h2 style={{ ...h2, color: C.orangeLight }}>Open questions</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: C.muted }}>
            {out.open_questions.map(f => <li key={f}>{FACT_LABELS[f] || f}</li>)}
          </ul>
        </div>
      )}

      <div style={section}>
        <button style={{ ...button('ghost'), textAlign: 'left' }} onClick={() => setShowTrace(s => !s)}>
          {showTrace ? 'Hide' : 'Show'} explanation trace ({out.trace.length} steps)
        </button>
        {showTrace && (
          <div style={{ overflowX: 'auto' }}>
            <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: C.muted, whiteSpace: 'pre-wrap' }}>{out.trace.join('\n')}</pre>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={button('primary')} onClick={onRestart}>Evaluate again</button>
        <button style={button('ghost')} onClick={download}>Download JSON</button>
        <Link to="/" style={{ ...button('ghost'), textDecoration: 'none' }}>All cases</Link>
      </div>
    </>
  )
}

export default function Evaluate() {
  const { caseId } = useParams()
  const preset = useMemo(() => (caseId && caseId !== 'new' ? findCase(caseId) : null), [caseId])
  const [kase, setKase] = useState(preset)
  const [step, setStep] = useState(null)
  const [count, setCount] = useState(0)
  const session = useRef(null)
  const [, force] = useState(0)

  const start = k => {
    session.current = createSession(KB, k)
    setKase(k); setCount(0); setStep(session.current.next())
  }
  useEffect(() => { if (preset) start(preset); else { setKase(null); setStep(null) } }, [preset]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (step?.type === 'done' && kase?.case_id !== 'custom') saveDecision(kase.case_id, step.output.decision) }, [step, kase])

  const answer = v => { setCount(c => c + 1); setStep(session.current.answer(v)); force(n => n + 1) }
  const fired = session.current?.fired || []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 110px', fontFamily: font }}>
      <Link to="/" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>&larr; Cases</Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 4px', letterSpacing: -0.4 }}>{kase?.title || kase?.description || 'New evaluation'}</h1>
      {kase && <p style={{ color: C.muted, fontSize: 14, margin: '0 0 16px' }}>{kase.title ? kase.description : kase.location}</p>}

      {!kase && <NewCaseForm onStart={start} />}

      {kase && step && (
        <div className="two-col">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {step.type === 'question' && <QuestionCard step={step} count={count + 1} onAnswer={answer} />}
            {step.type === 'done' && <Result out={step.output} onRestart={() => start(kase)} />}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={section}>
              <h2 style={h2}>Reasoning so far</h2>
              {!fired.length && <div style={{ fontSize: 13, color: C.faint }}>No rule has fired yet.</div>}
              {fired.map(id => {
                const r = KB.rules.rules.find(x => x.id === id)
                return (
                  <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: C.greenLight }}>&#10003;</span>
                    <span style={{ color: C.faint, width: 30 }}>{id}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{r.name}</span>
                    {r.then.alert && <LevelBadge level={r.then.alert.level} />}
                  </div>
                )
              })}
            </div>
            <details style={section}>
              <summary style={{ ...h2, cursor: 'pointer' }}>Known facts ({Object.keys(kase.facts).length})</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {Object.entries(kase.facts).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 12, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, minWidth: 0, overflowWrap: 'anywhere' }}>{k}</span>
                    <span style={{ color: C.text, textAlign: 'right', overflowWrap: 'anywhere' }}>{show(v)}</span>
                  </div>
                ))}
              </div>
            </details>
          </aside>
        </div>
      )}
    </div>
  )
}
