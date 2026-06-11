'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useTimeframe, useTheme } from '@/components/providers'
import { useMetrics } from '@/components/useMetrics'
import KpiRow from '@/components/KpiRow'
import YesterdayWinners from './YesterdayWinners'
import { Card, Spinner } from '@/components/ui'
import { getPortfolioDaily, type PortfolioPoint } from '@/lib/queries'
import { aggregate, fmtCompactCurrency, fmtCurrency, fmtRoas, num } from '@/lib/metrics'

export default function OverviewPage() {
  const { window } = useTimeframe()
  const { isDark } = useTheme()
  const { data, loading } = useMetrics('campaign', window)
  const [trend, setTrend] = useState<PortfolioPoint[]>([])

  useEffect(() => {
    getPortfolioDaily().then((r) => setTrend(r.data))
  }, [])

  const totals = useMemo(() => aggregate(data), [data])
  const chart = useMemo(
    () => trend.slice(-60).map((p) => ({ date: p.date.slice(5), spend: p.spend, roas: num(p.roas) })),
    [trend],
  )

  const grid = isDark ? '#1f2937' : '#e5e7eb'
  const axis = isDark ? '#9ca3af' : '#6b7280'

  return (
    <div className="space-y-6">
      {loading ? <Spinner label="Loading overview…" /> : <KpiRow totals={totals} />}

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          Account trend <span className="font-normal text-gray-400">· daily spend &amp; ROAS</span>
        </h3>
        {chart.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
            No daily history yet. Apply <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">db/*.sql</code> and run the
            daily snapshot workflows — the trend fills in from there.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="date" stroke={axis} tick={{ fontSize: 11 }} minTickGap={20} />
              <YAxis yAxisId="l" stroke={axis} tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompactCurrency(v, 0)} />
              <YAxis yAxisId="r" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#111827' : '#fff', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 }}
                formatter={(value: any, key: any) => (key === 'spend' ? fmtCurrency(value) : fmtRoas(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="l" dataKey="spend" name="Spend" fill="#06b6d4" radius={[3, 3, 0, 0]} />
              <Line yAxisId="r" dataKey="roas" name="ROAS" stroke="#10b981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <YesterdayWinners />
    </div>
  )
}
