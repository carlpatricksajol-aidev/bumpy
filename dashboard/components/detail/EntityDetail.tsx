'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Modal, Badge, Spinner, deviceTone } from '@/components/ui'
import { useTheme } from '@/components/providers'
import { getEntityMetrics, getDaily } from '@/lib/queries'
import { WINDOWS, type Level, type MetricRow, type DailyPoint } from '@/lib/types'
import {
  num, fmtCurrency, fmtCompactCurrency, fmtInt, fmtPercent, fmtRoas, fmtNum,
  roasTextClass, ageInDays, budgetSpentPct,
} from '@/lib/metrics'

interface Target { level: Level; id: string; name?: string }
interface Ctx { open: (t: Target) => void }
const EntityDetailContext = createContext<Ctx>({ open: () => {} })
export const useEntityDetail = () => useContext(EntityDetailContext)

const LEVEL_LABEL: Record<Level, string> = { campaign: 'Campaign', adset: 'Ad Set', creative: 'Creative' }

// metric rows for the matrix (metric × window)
const MATRIX: { key: keyof MetricRow; label: string; fmt: (v: unknown) => string; tone?: boolean }[] = [
  { key: 'spend', label: 'Spend', fmt: (v) => fmtCurrency(v) },
  { key: 'revenue', label: 'Revenue', fmt: (v) => fmtCurrency(v) },
  { key: 'roas', label: 'ROAS', fmt: (v) => fmtRoas(v), tone: true },
  { key: 'conversions', label: 'Conversions', fmt: (v) => fmtInt(v) },
  { key: 'cpp', label: 'CPP', fmt: (v) => fmtCurrency(v, 2) },
  { key: 'cpm', label: 'CPM', fmt: (v) => fmtCurrency(v, 2) },
  { key: 'ctr', label: 'CTR', fmt: (v) => fmtPercent(v) },
  { key: 'cpc', label: 'CPC', fmt: (v) => fmtCurrency(v, 2) },
  { key: 'impressions', label: 'Impressions', fmt: (v) => fmtInt(v) },
  { key: 'clicks', label: 'Clicks', fmt: (v) => fmtInt(v) },
  { key: 'frequency', label: 'Frequency', fmt: (v) => fmtNum(v) },
  { key: 'pp10k', label: 'PP10K', fmt: (v) => fmtNum(v, 1) },
]

export function EntityDetailProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null)
  const open = useCallback((t: Target) => setTarget(t), [])
  return (
    <EntityDetailContext.Provider value={{ open }}>
      {children}
      <DetailModal target={target} onClose={() => setTarget(null)} />
    </EntityDetailContext.Provider>
  )
}

function DetailModal({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const { isDark } = useTheme()
  const [rows, setRows] = useState<MetricRow[]>([])
  const [daily, setDaily] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!target) return
    let cancelled = false
    setLoading(true)
    setRows([])
    setDaily([])
    Promise.all([getEntityMetrics(target.level, target.id), getDaily(target.level, target.id)]).then(
      ([m, d]) => {
        if (cancelled) return
        setRows(m.data)
        setDaily(d.data)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [target])

  const byWindow = useMemo(() => {
    const map = new Map<number, MetricRow>()
    rows.forEach((r) => map.set(num(r.window_days), r))
    return map
  }, [rows])

  // attributes from the longest available window (most complete)
  const attr = byWindow.get(30) ?? byWindow.get(60) ?? byWindow.get(7) ?? rows[0]
  const name = target?.name ?? attr?.ad_name ?? attr?.adset_name ?? attr?.campaign_name ?? 'Unknown'

  const chartData = useMemo(
    () =>
      daily.map((d) => ({
        date: d.date?.slice(5), // MM-DD
        spend: num(d.spend),
        roas: num(d.purchase_roas) || (num(d.spend) > 0 ? num(d.revenue) / num(d.spend) : 0),
        conversions: num(d.conversions),
      })),
    [daily],
  )

  const grid = isDark ? '#1f2937' : '#e5e7eb'
  const axis = isDark ? '#9ca3af' : '#6b7280'

  const breakdown = (obj?: Record<string, number> | null) =>
    obj && Object.keys(obj).length
      ? Object.entries(obj)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
      : []

  const countryBd = breakdown(attr?.country_breakdown)
  const deviceBd = breakdown(attr?.device_breakdown)
  const age = ageInDays(attr?.created_at)
  const bPct = attr ? budgetSpentPct(num(attr.spend), attr.budget, num(attr.window_days) || 30) : null

  return (
    <Modal open={!!target} onClose={onClose} maxWidth="max-w-5xl">
      {/* header */}
      <div className="border-b border-gray-200 p-6 pr-12 dark:border-gray-800">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {target && <Badge tone="cyan">{LEVEL_LABEL[target.level]}</Badge>}
          {attr?.status && <Badge tone={attr.status === 'ACTIVE' ? 'green' : 'gray'}>{attr.status}</Badge>}
          {attr?.primary_device && <Badge tone={deviceTone(attr.primary_device)}>{attr.primary_device}</Badge>}
          {attr?.primary_country && <Badge tone="blue">{attr.primary_country}</Badge>}
          {attr?.persona && <Badge tone="purple">{attr.persona}</Badge>}
        </div>
        <h2 className="break-words text-lg font-bold text-gray-900 dark:text-white">{name}</h2>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {age != null && <span>{age} days old</span>}
          {attr?.budget != null && num(attr.budget) > 0 && <span>Budget ${num(attr.budget).toFixed(0)}/day</span>}
          {bPct != null && <span>{bPct.toFixed(0)}% budget used</span>}
          {attr?.concept_code && <span>Concept: {attr.concept_code}</span>}
          {attr?.media_type && <span>{attr.media_type}</span>}
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading entity…" />
      ) : (
        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          {/* creative preview */}
          {attr?.thumbnail_url && (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attr.thumbnail_url}
                alt={name}
                className="h-32 w-32 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
              />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="mb-1 font-medium text-gray-700 dark:text-gray-200">Creative preview</div>
                {attr.permalink ? (
                  <a href={attr.permalink} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline dark:text-cyan-400">
                    Open the ad on Facebook ↗
                  </a>
                ) : (
                  <span>Thumbnail from Meta{attr.video_id ? ' · video ad' : ''}</span>
                )}
              </div>
            </div>
          )}

          {/* metric × window matrix */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Metrics by window</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Metric</th>
                    {WINDOWS.map((w) => (
                      <th key={w.value} className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        {w.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {MATRIX.map((m) => (
                    <tr key={String(m.key)}>
                      <td className="whitespace-nowrap px-3 py-1.5 text-gray-600 dark:text-gray-300">{m.label}</td>
                      {WINDOWS.map((w) => {
                        const row = byWindow.get(w.value)
                        const v = row ? row[m.key] : undefined
                        const tone = m.tone && row ? roasTextClass(num(v)) : 'text-gray-700 dark:text-gray-200'
                        return (
                          <td key={w.value} className={`px-3 py-1.5 text-right tabular-nums ${tone}`}>
                            {row ? m.fmt(v) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* trend */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Daily trend{' '}
              <span className="font-normal text-gray-400">({daily.length} days)</span>
            </h3>
            {chartData.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400 dark:border-gray-700">
                No daily history yet — it accumulates once the daily snapshot workflow runs.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="date" stroke={axis} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" stroke={axis} tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompactCurrency(v, 0)} />
                  <YAxis yAxisId="r" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#111827' : '#fff',
                      border: `1px solid ${grid}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: any, key: any) =>
                      key === 'spend' ? fmtCurrency(value) : key === 'roas' ? fmtRoas(value) : fmtInt(value)
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="spend" name="Spend" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="r" dataKey="roas" name="ROAS" stroke="#10b981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* breakdowns */}
          {(countryBd.length > 0 || deviceBd.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {countryBd.length > 0 && <BreakdownCard title="Spend by country" rows={countryBd} />}
              {deviceBd.length > 0 && <BreakdownCard title="Spend by device" rows={deviceBd} />}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function BreakdownCard({ title, rows }: { title: string; rows: [string, number][] }) {
  const total = rows.reduce((s, [, v]) => s + v, 0) || 1
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <div className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="mb-0.5 flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>{k}</span>
              <span className="tabular-nums">{fmtCurrency(v)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${(v / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
