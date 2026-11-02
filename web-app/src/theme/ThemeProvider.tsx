import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme-context'

const STORAGE_KEY = 'theme'

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* storage blocked: fall through to the system preference */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* not persisted */ }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), [])
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
