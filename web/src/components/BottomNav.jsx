import { NavLink } from 'react-router-dom'
import { C } from '../theme'

// Mobile bottom navigation, as in Ayudas Colombia.
const IcoMap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" /></svg>
)
const IcoAsk = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" /></svg>
)
const IcoBook = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" /></svg>
)

export default function BottomNav() {
  const tab = ({ isActive }) => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none',
    color: isActive ? C.blueLight : C.muted, fontSize: 10, fontWeight: isActive ? 600 : 400, paddingTop: 4,
  })
  return (
    <nav className="mobile-only" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, background: C.card, borderTop: '1px solid #21262d',
      paddingBottom: 'env(safe-area-inset-bottom, 4px)', zIndex: 1000,
    }}>
      <div style={{ display: 'flex', paddingTop: 8, paddingBottom: 6 }}>
        <NavLink to="/" end style={tab}><IcoMap />Cases</NavLink>
        <NavLink to="/evaluate/new" style={tab}><IcoAsk />Evaluate</NavLink>
        <NavLink to="/rules" style={tab}><IcoBook />Rules</NavLink>
      </div>
    </nav>
  )
}
