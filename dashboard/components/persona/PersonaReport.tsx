'use client'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTheme } from '@/components/providers'
import { getPersonaReport } from '@/lib/queries'
import { Card, Spinner, StatTile, EmptyState } from '@/components/ui'
import { exportToCSV } from '@/lib/csvExport'
import { Download } from 'lucide-react'
import { num, fmtCompactCurrency, fmtCurrency, fmtInt, fmtPercent, fmtRoas, roasTextClass } from '@/lib/metrics'

interface Row {
  week: string; campaign_name: string; ad_name: string; persona: string; concept: string
  spend: number; revenue: number; roas: number; purchases: number; impressions: number
  link_clicks: number; ctr: number; cpm: number; cpc: number; cpp: number; frequency: number
}

function enrich(raw: any[]): Row[] {
  return raw.map((r) => {
    const adName = r['Ad name'] || ''
    const parts = adName.split('-')
    const spend = num(r['Amount spent (USD)'])
    const revenue = num(r['Purchases conversion value'])
    const purchases = num(r['Purchases'])
    const impressions = num(r['Impressions'])
    const linkClicks = num(r['Link clicks'])
    return {
      week: r['Week'] || r['week'] || '',
      campaign_name: r['Campaign name'] || '',
      ad_name: adName,
      persona: r['Persona'] || parts[3] || 'Unknown',
      concept: r['Concept'] || parts[2] || 'Unknown',
      spend, revenue, purchases, impressions, link_clicks: linkClicks,
      roas: num(r['Purchase ROAS (return on ad spend)']) || (spend > 0 ? revenue / spend : 0),
      cpm: num(r['CPM (cost per 1,000 impressions)']) || (impressions > 0 ? (spend / impressions) * 1000 : 0),
      ctr: num(r['CTR (link click-through rate)']) || (impressions > 0 ? linkClicks / impressions : 0),
      cpc: linkClicks > 0 ? spend / linkClicks : 0,
      cpp: num(r['Cost per purchase']) || (purchases > 0 ? spend / purchases : 0),
      frequency: num(r['Frequency']),
    }
  })
}

const PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a78bfa']

export default function PersonaReport() {
  const { isDark } = useTheme()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [persona, setPersona] = useState('All')

  useEffect(() => {
    getPersonaReport().then((r) => {
      setRows(enrich(r.data))
      setLoading(false)
    })
  }, [])

  const personas = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => r.persona))).sort()], [rows])
  const filtered = useMemo(() => (persona === 'All' ? rows : rows.filter((r) => r.persona === persona)), [rows, persona])

  const totals = useMemo(
    () => filtered.reduce((a, r) => {
      a.spend += r.spend; a.revenue += r.revenue; a.purchases += r.purchases
      return a
    }, { spend: 0, revenue: 0, purchases: 0 }),
    [filtered],
  )
  const overallRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0

  const byPersona = useMemo(() => {
    const m = new Map<string, { persona: string; spend: number; revenue: number }>()
    filtered.forEach((r) => {
      if (!m.has(r.persona)) m.set(r.persona, { persona: r.persona, spend: 0, revenue: 0 })
      const o = m.get(r.persona)!
      o.spend += r.spend; o.revenue += r.revenue
    })
    return [...m.values()].map((o) => ({ ...o, roas: o.spend > 0 ? o.revenue / o.spend : 0 })).sort((a, b) => b.spend - a.spend)
  }, [filtered])

  const grid = isDark ? '#1f2937' : '#e5e7eb'
  const axis = isDark ? '#9ca3af' : '#6b7280'
  const sel = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white'

  if (loading) return <Spinner label="Loading persona report…" />
  if (rows.length === 0)
    return <EmptyState title="No persona report data" hint="The creative_persona_report table is empty or not reachable with the anon key." />

  const exportCsv = () =>
    exportToCSV(filtered, `persona_report${persona !== 'All' ? `_${persona}` : ''}`, [
      { key: 'week', label: 'Week' }, { key: 'campaign_name', label: 'Campaign' }, { key: 'ad_name', label: 'Ad Name' },
      { key: 'persona', label: 'Persona' }, { key: 'concept', label: 'Concept' }, { key: 'spend', label: 'Spend' },
      { key: 'revenue', label: 'Revenue' }, { key: 'roas', label: 'ROAS' }, { key: 'purchases', label: 'Purchases' },
      { key: 'cpp', label: 'CPP' }, { key: 'impressions', label: 'Impressions' }, { key: 'ctr', label: 'CTR' },
      { key: 'cpm', label: 'CPM' }, { key: 'frequency', label: 'Frequency' },
    ])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <select value={persona} onChange={(e) => setPersona(e.target.value)} className={sel}>
          {personas.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Spend" value={fmtCompactCurrency(totals.spend)} />
        <StatTile label="Revenue" value={fmtCompactCurrency(totals.revenue)} />
        <StatTile label="ROAS" value={<span className={roasTextClass(overallRoas)}>{fmtRoas(overallRoas)}</span>} />
        <StatTile label="Purchases" value={fmtInt(totals.purchases)} />
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Spend &amp; ROAS by persona</h3>
        <ResponsiveContainer width="100%" height={Math.max(280, byPersona.length * 30)}>
          <BarChart layout="vertical" data={byPersona} margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={grid} />
            <XAxis type="number" stroke={axis} tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompactCurrency(v, 0)} />
            <YAxis type="category" dataKey="persona" width={130} tick={{ fontSize: 11, fill: axis }} stroke="none" />
            <Tooltip
              contentStyle={{ backgroundColor: isDark ? '#111827' : '#fff', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 }}
              formatter={(v: any, k: any) => (k === 'spend' ? fmtCurrency(v) : fmtRoas(v))}
            />
            <Bar dataKey="spend" name="Spend" radius={[0, 4, 4, 0]}>
              {byPersona.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Detailed data</h3>
          <p className="text-xs text-gray-400">{filtered.length.toLocaleString()} rows</p>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/60">
              <tr className="text-left uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {['Week', 'Campaign', 'Ad Name', 'Persona', 'Spend', 'Revenue', 'ROAS', 'Purch', 'CPP', 'CTR', 'CPM', 'Freq'].map((h, i) => (
                  <th key={h} className={`px-3 py-2 ${i >= 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.slice(0, 1000).map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="whitespace-nowrap px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.week}</td>
                  <td className="max-w-[160px] truncate px-3 py-1.5 text-gray-600 dark:text-gray-300" title={r.campaign_name}>{r.campaign_name}</td>
                  <td className="max-w-[200px] truncate px-3 py-1.5 text-gray-600 dark:text-gray-300" title={r.ad_name}>{r.ad_name}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.persona}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">{fmtCurrency(r.spend, 2)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">{fmtCurrency(r.revenue, 2)}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${roasTextClass(r.roas)}`}>{fmtRoas(r.roas)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{r.purchases}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">{fmtCurrency(r.cpp, 2)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">{fmtPercent(r.ctr)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">{fmtCurrency(r.cpm, 2)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">{r.frequency.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
