'use client'
import { WINDOWS } from '@/lib/types'
import { useTimeframe } from '@/components/providers'

export default function TimeframePicker() {
  const { window, setWindow } = useTimeframe()
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-800 dark:bg-gray-800/60">
      {WINDOWS.map((w) => (
        <button
          key={w.value}
          onClick={() => setWindow(w.value)}
          title={w.label}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            window === w.value
              ? 'bg-cyan-600 text-white shadow'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {w.short}
        </button>
      ))}
    </div>
  )
}
