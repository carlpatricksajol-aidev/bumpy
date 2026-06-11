'use client'
import { useState } from 'react'
import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PasskeyLogin({ onSuccess }: { onSuccess: () => void }) {
  const [passkey, setPasskey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('passkeys')
        .select('*')
        .eq('passkey', passkey.trim())
        .eq('is_active', true)
        .single()

      if (fetchError || !data) {
        setError('Invalid or inactive passkey')
        setLoading(false)
        return
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This passkey has expired')
        setLoading(false)
        return
      }

      await supabase
        .from('passkeys')
        .update({ last_used_at: new Date().toISOString(), usage_count: (data.usage_count ?? 0) + 1 })
        .eq('id', data.id)

      localStorage.setItem(
        'bumpy_auth',
        JSON.stringify({
          passkey: data.passkey,
          userName: data.user_name,
          authenticatedAt: new Date().toISOString(),
          expiresAt: data.expires_at || null,
        }),
      )
      onSuccess()
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900">
        <div className="mb-6 flex justify-center">
          <Image src="/bumpy-logo.png" alt="Bumpy" width={64} height={64} className="rounded-xl" />
        </div>
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Bumpy Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Enter your passkey to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="passkey" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Passkey
            </label>
            <input
              id="passkey"
              type="text"
              value={passkey}
              autoFocus
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Enter your passkey"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-all placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-cyan-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <p className="text-sm text-rose-500">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !passkey.trim()}
            className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-medium text-white transition-all hover:bg-cyan-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-700"
          >
            {loading ? 'Verifying…' : 'Access Dashboard'}
          </button>
        </form>
        <p className="mt-6 border-t border-gray-200 pt-6 text-center text-xs text-gray-400 dark:border-gray-800">
          Need access? Contact your administrator
        </p>
      </div>
    </div>
  )
}
