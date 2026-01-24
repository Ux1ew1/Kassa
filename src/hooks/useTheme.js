import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kassa-theme'

export function getPreferredTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  let saved = null

  try {
    saved = window.localStorage.getItem(STORAGE_KEY)
  } catch (error) {
    saved = null
  }
  if (saved === 'light' || saved === 'dark') {
    return saved
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return

  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
}

export function syncInitialTheme() {
  const preferred = getPreferredTheme()
  applyTheme(preferred)
}

export function useTheme() {
  const [theme, setTheme] = useState(() => getPreferredTheme())

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch (error) {
      // ignore write errors
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme, setTheme }
}
