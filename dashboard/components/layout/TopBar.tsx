'use client'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from '@/components/providers'
import TimeframePicker from './TimeframePicker'

export default function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isDark, toggle } = useTheme()

  const logout = () => {
    localStorage.removeItem('bumpy_auth')
    location.reload()
  }

  return (
    <header className="sticky top-0 z-20 -mx-8 mb-6 flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50/80 px-8 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <TimeframePicker />
        <button
          onClick={toggle}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          title="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
