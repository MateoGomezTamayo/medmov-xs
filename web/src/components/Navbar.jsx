import { Link, NavLink } from 'react-router-dom'
import { C } from '../theme'

// Same top bar as Ayudas Colombia: two-colour wordmark, links on desktop.
export default function Navbar() {
  const link = ({ isActive }) => ({ color: isActive ? C.blueLight : C.muted, textDecoration: 'none', fontWeight: 500, fontSize: 14 })
  return (
    <nav style={{ background: C.card, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'baseline', gap: 6, textDecoration: 'none' }}>
          <span style={{ color: C.blueLight, fontWeight: 800, fontSize: 17 }}>MedMov</span>
          <span style={{ color: C.yellow, fontWeight: 800, fontSize: 17 }}>XS</span>
          <span style={{ color: C.faint, fontSize: 12, marginLeft: 6 }}>Medellín</span>
        </Link>
        <div className="desktop-only" style={{ gap: 24, alignItems: 'center' }}>
          <NavLink to="/" end style={link}>Cases</NavLink>
          <NavLink to="/evaluate/new" style={link}>New evaluation</NavLink>
          <NavLink to="/rules" style={link}>Knowledge base</NavLink>
          <a href="https://github.com/MateoGomezTamayo/medmov-xs" target="_blank" rel="noreferrer" style={{ color: C.faint, fontSize: 13, textDecoration: 'none' }}>GitHub</a>
        </div>
      </div>
    </nav>
  )
}
