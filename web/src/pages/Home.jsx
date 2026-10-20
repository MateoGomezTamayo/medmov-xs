import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { C, card, DECISION, font } from '../theme'
import { CASES } from '../data/knowledge'
import { DecisionPill } from '../components/Badges'
import { lastDecisions } from '../store'

// Coloured round pins, same style as Ayudas Colombia's map.
function pin(color) {
  return L.divIcon({
    html: `<div style="width:30px;height:30px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15],
  })
}

export default function Home() {
  const decisions = lastDecisions()
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 110px', fontFamily: font }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Mobility conflicts, before they happen</h1>
      <p style={{ color: C.muted, fontSize: 14, margin: '6px 0 18px', maxWidth: 640 }}>
        An expert system that evaluates a road closure in Medellín, asks only what it needs, and explains which
        planning goal each detour would break.
      </p>

      <div style={{ ...card, overflow: 'hidden', marginBottom: 18 }}>
        <MapContainer center={[6.2445, -75.584]} zoom={14} style={{ height: 320, width: '100%' }} scrollWheelZoom={false}>
          {/* Esri World Dark Gray: free, no key (same base map as Ayudas Colombia). */}
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
          {CASES.map(c => (
            <Marker key={c.case_id} position={c.position} icon={pin(DECISION[decisions[c.case_id]]?.solid || C.blue)}>
              <Popup>
                <b>{c.title}</b><br />{c.facts['detour.hotspot']}<br />
                <Link to={`/evaluate/${c.case_id}`}>Evaluate this case</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div style={{ padding: '8px 14px', fontSize: 11, color: C.faint }}>Pins show each case's detour hotspot (approximate location). Colour = last decision.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
        {CASES.map(c => (
          <div key={c.case_id} style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{c.title}</span>
              <DecisionPill decision={decisions[c.case_id]} />
            </div>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.45 }}>{c.description}</p>
            <div style={{ fontSize: 12, color: C.faint }}>{c.location} · {Object.keys(c.facts).length} known facts</div>
            <Link to={`/evaluate/${c.case_id}`} style={{ marginTop: 'auto', background: C.blue, color: C.text, textAlign: 'center', borderRadius: 12, padding: '11px 14px', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              Evaluate
            </Link>
          </div>
        ))}
        <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderStyle: 'dashed' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>New case</span>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.45 }}>
            Start with no facts. The engine works backwards from its rules and asks you one question at a time.
          </p>
          <Link to="/evaluate/new" style={{ marginTop: 'auto', border: `1px solid ${C.border}`, color: C.text, textAlign: 'center', borderRadius: 12, padding: '11px 14px', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            Start a new evaluation
          </Link>
        </div>
      </div>
    </div>
  )
}
