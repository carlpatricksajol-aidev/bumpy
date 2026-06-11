'use client'
import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useTimeframe } from '@/components/providers'
import { useMetrics } from '@/components/useMetrics'
import { useEntityDetail } from '@/components/detail/EntityDetail'
import MetricTable from './MetricTable'
import HierarchyTable from './HierarchyTable'
import { adsetColumns, creativeColumns, groupColumns } from './columns'
import KpiRow from '@/components/KpiRow'
import { Spinner } from '@/components/ui'
import { aggregate, groupBy, num } from '@/lib/metrics'
import { exportToCSV } from '@/lib/csvExport'
import type { GroupLevel, MetricRow } from '@/lib/types'

export default function PerformancePage({ group }: { group: GroupLevel }) {
  if (group === 'campaign') return <CampaignView />
  if (group === 'adset') return <FlatAdsetView />
  if (group === 'creative') return <CreativeView />
  return <GroupView kind={group} />
}

function HeaderBar({ count, onExport }: { count: number; onExport: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-semibold text-cyan-600 dark:text-cyan-400">{count.toLocaleString()}</span> rows
      </div>
      <button
        onClick={onExport}
        className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
      >
        <Download className="h-4 w-4" /> Export CSV
      </button>
    </div>
  )
}

const CSV_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'primary_device', label: 'Device' },
  { key: 'primary_country', label: 'Country' },
  { key: 'spend', label: 'Spend' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'roas', label: 'ROAS' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'cpp', label: 'CPP' },
  { key: 'cpm', label: 'CPM' },
  { key: 'ctr', label: 'CTR' },
  { key: 'frequency', label: 'Frequency' },
]

function exportRows(rows: MetricRow[], nameFn: (r: MetricRow) => string, file: string) {
  exportToCSV(rows.map((r) => ({ ...r, name: nameFn(r) })), file, CSV_COLS)
}

// ── Campaign (hierarchy) ────────────────────────────────────────────────────
function CampaignView() {
  const { window } = useTimeframe()
  const { data, loading } = useMetrics('campaign', window)
  const totals = useMemo(() => aggregate(data), [data])
  return (
    <div className="space-y-5">
      <KpiRow totals={totals} />
      <HeaderBar count={data.length} onExport={() => exportRows(data, (r) => r.campaign_name ?? '', `campaigns_${window}d`)} />
      {loading ? <Spinner label="Loading…" /> : <HierarchyTable />}
    </div>
  )
}

// ── Ad sets (flat) ──────────────────────────────────────────────────────────
function FlatAdsetView() {
  const { window } = useTimeframe()
  const { data, loading } = useMetrics('adset', window)
  const { open } = useEntityDetail()
  const totals = useMemo(() => aggregate(data), [data])
  if (loading) return <Spinner label="Loading ad sets…" />
  return (
    <div className="space-y-5">
      <KpiRow totals={totals} />
      <HeaderBar count={data.length} onExport={() => exportRows(data, (r) => r.adset_name ?? '', `adsets_${window}d`)} />
      <MetricTable
        rows={data}
        columns={adsetColumns}
        rowKey={(r) => r.adset_id ?? ''}
        onRowClick={(r) => open({ level: 'adset', id: r.adset_id ?? '', name: r.adset_name })}
      />
    </div>
  )
}

// ── Creatives (flat + filters) ──────────────────────────────────────────────
function CreativeView() {
  const { window } = useTimeframe()
  const { data, loading } = useMetrics('creative', window)
  const { open } = useEntityDetail()
  const [search, setSearch] = useState('')
  const [persona, setPersona] = useState('All')
  const [minSpend, setMinSpend] = useState(0)

  const personas = useMemo(
    () => ['All', ...Array.from(new Set(data.map((d) => d.persona).filter(Boolean) as string[])).sort()],
    [data],
  )
  const filtered = useMemo(
    () =>
      data.filter((r) => {
        if (persona !== 'All' && r.persona !== persona) return false
        if (minSpend && num(r.spend) < minSpend) return false
        if (search && !(r.ad_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [data, persona, minSpend, search],
  )
  const totals = useMemo(() => aggregate(filtered), [filtered])
  if (loading) return <Spinner label="Loading creatives…" />

  const sel = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white'
  return (
    <div className="space-y-5">
      <KpiRow totals={totals} />
      <div className="flex flex-wrap items-end gap-3">
        <input
          placeholder="Search ad name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${sel} min-w-[220px] flex-1`}
        />
        <select value={persona} onChange={(e) => setPersona(e.target.value)} className={sel}>
          {personas.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min spend"
          value={minSpend || ''}
          onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
          className={`${sel} w-32`}
        />
      </div>
      <HeaderBar count={filtered.length} onExport={() => exportRows(filtered, (r) => r.ad_name ?? '', `creatives_${window}d`)} />
      <MetricTable
        rows={filtered}
        columns={creativeColumns}
        rowKey={(r) => r.ad_id ?? ''}
        onRowClick={(r) => open({ level: 'creative', id: r.ad_id ?? '', name: r.ad_name })}
      />
    </div>
  )
}

// ── Concept / Persona (grouped) ─────────────────────────────────────────────
function GroupView({ kind }: { kind: 'concept' | 'persona' }) {
  const { window } = useTimeframe()
  const { data, loading } = useMetrics('creative', window)
  const grouped = useMemo(() => groupBy(data, kind === 'persona' ? 'persona' : 'concept_code'), [data, kind])
  const totals = useMemo(() => aggregate(data), [data])
  if (loading) return <Spinner label="Loading…" />
  return (
    <div className="space-y-5">
      <KpiRow totals={totals} />
      <HeaderBar
        count={grouped.length}
        onExport={() => exportRows(grouped, (r) => (kind === 'persona' ? r.persona : r.concept_code) || 'Unknown', `${kind}_${window}d`)}
      />
      <MetricTable rows={grouped} columns={groupColumns(kind)} rowKey={(r) => (kind === 'persona' ? r.persona : r.concept_code) ?? ''} />
    </div>
  )
}
