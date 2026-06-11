'use client'
import { useEffect, useState } from 'react'
import { User, Palette, Database } from 'lucide-react'
import { Card } from '@/components/ui'
import { useTheme } from '@/components/providers'

export default function SettingsPage() {
  const { isDark, toggle } = useTheme()
  const [user, setUser] = useState<string>('—')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bumpy_auth')
      if (raw) setUser(JSON.parse(raw).userName || 'Authenticated user')
    } catch {}
  }, [])

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-5 w-5 text-cyan-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Account</h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Signed in as <span className="font-medium text-gray-900 dark:text-white">{user}</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-5 w-5 text-cyan-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
        </div>
        <button
          onClick={toggle}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Switch to {isDark ? 'light' : 'dark'} mode
        </button>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Database className="h-5 w-5 text-cyan-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Data pipeline</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Metrics are read from the Supabase views (<code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">v_*_metrics</code>),
          backed by daily snapshots written by the n8n workflows. Every window — Yesterday through 60 days — is derived from
          that history. See <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">db/README.md</code> and
          <code className="ml-1 rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">n8n/RUNBOOK.md</code> in the repo.
        </p>
      </Card>
    </div>
  )
}
