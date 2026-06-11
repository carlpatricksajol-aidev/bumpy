'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { WindowDays } from '@/lib/types'

// ── Theme ───────────────────────────────────────────────────────────────────
interface ThemeCtx {
  isDark: boolean
  toggle: () => void
}
const ThemeContext = createContext<ThemeCtx>({ isDark: true, toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)

// ── Timeframe (global window selector) ──────────────────────────────────────
interface TimeframeCtx {
  window: WindowDays
  setWindow: (w: WindowDays) => void
}
const TimeframeContext = createContext<TimeframeCtx>({ window: 7, setWindow: () => {} })
export const useTimeframe = () => useContext(TimeframeContext)

export function AppProviders({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true)
  const [window, setWindowState] = useState<WindowDays>(7)

  // hydrate persisted prefs
  useEffect(() => {
    const t = localStorage.getItem('bumpy_theme')
    const dark = t ? t === 'dark' : true
    setIsDark(dark)
    const w = parseInt(localStorage.getItem('bumpy_window') || '7', 10) as WindowDays
    if ([1, 7, 14, 28, 30, 60].includes(w)) setWindowState(w)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('bumpy_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const setWindow = (w: WindowDays) => {
    setWindowState(w)
    localStorage.setItem('bumpy_window', String(w))
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((d) => !d) }}>
      <TimeframeContext.Provider value={{ window, setWindow }}>{children}</TimeframeContext.Provider>
    </ThemeContext.Provider>
  )
}
