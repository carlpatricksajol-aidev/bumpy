'use client'
import { useEffect, useState } from 'react'
import PasskeyLogin from './PasskeyLogin'
import { Spinner } from '@/components/ui'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bumpy_auth')
      if (!raw) return setAuthed(false)
      const parsed = JSON.parse(raw)
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        localStorage.removeItem('bumpy_auth')
        return setAuthed(false)
      }
      setAuthed(true)
    } catch {
      localStorage.removeItem('bumpy_auth')
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner label="Loading…" />
      </div>
    )
  }
  if (!authed) return <PasskeyLogin onSuccess={() => setAuthed(true)} />
  return <>{children}</>
}
