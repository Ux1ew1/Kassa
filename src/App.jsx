import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Kassa from './pages/Kassa'
import Admin from './pages/Admin'
import AiMenu from './pages/AiMenu'
import Reports from './pages/Reports'
import Supplies from './pages/Supplies'

/**
 * Root application router.
 * @returns {JSX.Element} App routes.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Kassa />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ai-menu" element={<AiMenu />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/supplies" element={<Supplies />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

