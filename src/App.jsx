import { useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Kassa from './pages/Kassa'
import Admin from './pages/Admin'
import Register from './pages/Register'
import { LanguageProvider } from './contexts/LanguageContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { useSeo } from './hooks/useSeo'

const AUTH_STORAGE_KEY = 'kassa_user'
const ROOM_STORAGE_KEY = 'kassa_active_room'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      !UUID_PATTERN.test(parsed.id) ||
      typeof parsed.login !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const getStoredRoom = () => {
  try {
    const raw = localStorage.getItem(ROOM_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.role !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function AppRoutes({ isAuthed, canManageMenu, user, handleLogout, activeRoom, handleRoomChange, handleRegistered }) {
  const location = useLocation()

  useSeo({
    pathname: location.pathname,
    isAuthed,
  })

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthed ? (
            <Kassa
              user={user}
              onLogout={handleLogout}
              activeRoom={activeRoom}
              onRoomChange={handleRoomChange}
            />
          ) : (
            <Register onRegistered={handleRegistered} />
          )
        }
      />
      <Route
        path="/admin"
        element={
          isAuthed && canManageMenu ? (
            <Admin user={user} activeRoom={activeRoom} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  )
}

/**
 * Root application router.
 * @returns {JSX.Element} App routes.
 */
function App() {
  const [user, setUser] = useState(() => getStoredUser())
  const [activeRoom, setActiveRoom] = useState(() => getStoredRoom())

  const isAuthed = useMemo(() => Boolean(user?.id), [user])
  const canManageMenu = useMemo(
    () => activeRoom?.role === 'owner' || activeRoom?.role === 'admin',
    [activeRoom],
  )

  const handleRegistered = (nextUser) => {
    setUser(nextUser)
    setActiveRoom(null)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    localStorage.removeItem(ROOM_STORAGE_KEY)
  }

  const handleLogout = () => {
    setUser(null)
    setActiveRoom(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(ROOM_STORAGE_KEY)
  }

  const handleRoomChange = (room) => {
    setActiveRoom(room)
    if (room) {
      localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(room))
    } else {
      localStorage.removeItem(ROOM_STORAGE_KEY)
    }
  }

  return (
    <LanguageProvider>
      <CurrencyProvider>
        <BrowserRouter>
          <AppRoutes
            isAuthed={isAuthed}
            canManageMenu={canManageMenu}
            user={user}
            handleLogout={handleLogout}
            activeRoom={activeRoom}
            handleRoomChange={handleRoomChange}
            handleRegistered={handleRegistered}
          />
        </BrowserRouter>
      </CurrencyProvider>
    </LanguageProvider>
  )
}

export default App

