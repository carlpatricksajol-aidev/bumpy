'use client'
import { useMemo, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ZAxis,
} from 'recharts'
import { useTimeframe, useTheme } from '@/components/providers'
import { useMetrics } from '@/components/useMetrics'
import { useEntityDetail } from '@/components/detail/EntityDetail'
import { Card, Spinner } from '@/components/ui'
import { num, fmtCurrency, fmtRoas } from '@/lib/metrics'
import type { MetricRow } from '@/lib/types'

const METRICS = [
  { value: 'spend', label: 'Spend ($)', fmt: (v: number) => fmtCurrency(v) },
  { value: 'roas', label: 'ROAS', fmt: (v: number) => fmtRoas(v) },
  { value: 'conversions', label: 'Conversions', fmt: (v: number) => Math.round(v).toString() },
  { value: 'impressions', label: 'Impressions', fmt: (v: number) => Math.round(v).toLocaleString() },
  { value: 'ctr', label: 'CTR', fmt: (v: number) => `${(v * 100).toFixed(2)}%` },
  { value: 'cpp', label: 'CPP ($)', fmt: (v: number) => fmtCurrency(v, 2) },
  { value: 'frequency', label: 'Frequency', fmt: (v: number) => v.toFixed(2) },
] as const

const QUAD = [
  { label: 'Winners', sub: 'High / High', color: '#10b981', fn: (x: number, y: number, mx: number, my: number) => x >= mx && y >= my },
  { label: 'Hidden Gems', sub: 'Low / High', color: '#f59e0b', fn: (x: number, y: number, mx: number, my: number) => x < mx && y >= my },
  { label: 'Needs Attention', sub: 'High / Low', color: '#ef4444', fn: (x: number, y: number, mx: number, my: number) => x >= mx && y < my },
  { label: 'Test / Low', sub: 'Low / Low', color: '#6b7280', fn: (x: number, y: number, mx: number, my: number) => x < mx && y < my },
]

function median(values: number[]): number {
  const s = values.filter((v) => v > 0).sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

export default function CreativeExplorer() {
  const { window } = useTimeframe()
  const { isDark } = useTheme()
  const { data, loading } = useMetrics('creative', window)
  const { open } = useEntityDetail()
  const [xKey, setXKey] = useState('spend')
  const [yKey, setYKey] = useState('roas')
  const [minSpend, setMinSpend] = useState(50)

  const points = useMemo(() => {
    return data
      .filter((r) => num(r.spend) >= minSpend)
      .map((r) => ({
        x: num(r[xKey as keyof MetricRow]),
        y: num(r[yKey as keyof MetricRow]),
        spend: num(r.spend),
        roas: num(r.roas),
        id: r.ad_id ?? '',
        name: (r.ad_name ?? '').slice(0, 50),
        persona: r.persona,
      }))
      .filter((p) => p.id)
  }, [data, xKey, yKey, minSpend])

  const mx = useMemo(() => median(points.map((p) => p.x)), [points])
  const my = useMemo(() => median(points.map((p) => p.y)), [points])
  const colored = useMemo(
    () => points.map((p) => ({ ...p, color: QUAD.find((q) => q.fn(p.x, p.y, mx, my))?.color ?? '#6b7280' })),
    [points, mx, my],
  )

  const grid = isDark ? '#1f2937' : '#e5e7eb'
  const axis = isDark ? '#9ca3af' : '#6b7280'
  const sel = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white'
  const xM = METRICS.find((m) => m.value === xKey)!
  const yM = METRICS.find((m) => m.value === yKey)!

  if (loading) return <Spinner label="Loading creatives…" />

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">X axis</label>
            <select value={xKey} onChange={(e) => setXKey(e.target.value)} className={`${sel} w-full`}>
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Y axis</label>
            <select value={yKey} onChange={(e) => setYKey(e.target.value)} className={`${sel} w-full`}>
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Min spend</label>
            <input type="number" value={minSpend} onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)} className={`${sel} w-full`} />
          </div>
          <div className="flex items-end text-xs text-gray-400">{colored.length} creatives plotted</div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">{xM.label} vs {yM.label}</h3>
        <p className="mb-4 text-xs text-gray-400">Dashed lines = medians · click a point for full detail</p>
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis type="number" dataKey="x" name={xM.label} stroke={axis} tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name={yM.label} stroke={axis} tick={{ fontSize: 11 }} />
            <ZAxis range={[40, 40]} />
            <ReferenceLine x={mx} stroke={axis} strokeDasharray="4 3" />
            <ReferenceLine y={my} stroke={axis} strokeDasharray="4 3" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="max-w-[220px] rounded-lg border bg-white p-3 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-1 truncate font-semibold text-gray-900 dark:text-white">{d.name}</div>
                    {d.persona && <div className="text-gray-400">{d.persona}</div>}
                    <div className="mt-1 flex justify-between gap-4"><span className="text-gray-400">{xM.label}</span><span>{xM.fmt(d.x)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-gray-400">{yM.label}</span><span>{yM.fmt(d.y)}</span></div>
                  </div>
                )
              }}
            />
            <Scatter data={colored} onClick={(p: any) => p?.id && open({ level: 'creative', id: p.id, name: p.name })} cursor="pointer">
              {colored.map((p, i) => <Cell key={i} fill={p.color} fillOpacity={0.8} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUAD.map((q) => {
            const items = colored.filter((p) => q.fn(p.x, p.y, mx, my))
            const spend = items.reduce((s, c) => s + c.spend, 0)
            const wRoas = items.reduce((s, c) => s + c.spend * c.roas, 0)
            return (
              <div key={q.label} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: q.color }} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{q.label}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {items.length} ads · {fmtCurrency(spend)} · {fmtRoas(spend > 0 ? wRoas / spend : 0)}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
