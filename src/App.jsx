import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Kassa from './pages/Kassa'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Kassa />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

