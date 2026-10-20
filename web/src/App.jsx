import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Evaluate from './pages/Evaluate'
import Rules from './pages/Rules'
import { C, font } from './theme'

export default function App() {
  return (
    <div style={{ background: C.dark, minHeight: '100vh', color: C.text, fontFamily: font }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/evaluate/:caseId" element={<Evaluate />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
