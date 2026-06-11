'use client'
import { useEffect, useState } from 'react'
import { getMetrics } from '@/lib/queries'
import type { Level, MetricRow, WindowDays } from '@/lib/types'

export function useMetrics(level: Level, window: WindowDays) {
  const [data, setData] = useState<MetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMetrics(level, window).then((r) => {
      if (cancelled) return
      setData(r.data)
      setError(r.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [level, window])

  return { data, loading, error }
}
