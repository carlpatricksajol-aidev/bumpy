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
import { Card, Spinner } from '@/components/ui'
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
const SELECT_CLS = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      {children}
    </div>
  )
}

function CreativeView() {
  const { window } = useTimeframe()
  const { data, loading } = useMetrics('creative', window)
  const { open } = useEntityDetail()
  const [search, setSearch] = useState('')
  const [persona, setPersona] = useState('All')
  const [concept, setConcept] = useState('All')
  const [country, setCountry] = useState('All')
  const [device, setDevice] = useState('All')
  const [media, setMedia] = useState('All')
  const [minSpend, setMinSpend] = useState(0)

  const optionsFor = (key: keyof MetricRow) =>
    ['All', ...Array.from(new Set(data.map((d) => d[key]).filter(Boolean) as string[])).sort()]
  const personas = useMemo(() => optionsFor('persona'), [data])
  const concepts = useMemo(() => optionsFor('concept_code'), [data])
  const countries = useMemo(() => optionsFor('primary_country'), [data])
  const devices = useMemo(() => optionsFor('primary_device'), [data])
  const medias = useMemo(() => optionsFor('media_type'), [data])

  const filtered = useMemo(
    () =>
      data.filter((r) => {
        if (persona !== 'All' && r.persona !== persona) return false
        if (concept !== 'All' && r.concept_code !== concept) return false
        if (country !== 'All' && r.primary_country !== country) return false
        if (device !== 'All' && r.primary_device !== device) return false
        if (media !== 'All' && r.media_type !== media) return false
        if (minSpend && num(r.spend) < minSpend) return false
        if (search && !(r.ad_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [data, persona, concept, country, device, media, minSpend, search],
  )
  const totals = useMemo(() => aggregate(filtered), [filtered])
  const hasFilters =
    persona !== 'All' || concept !== 'All' || country !== 'All' || device !== 'All' || media !== 'All' || minSpend > 0 || !!search
  const clear = () => {
    setSearch(''); setPersona('All'); setConcept('All'); setCountry('All'); setDevice('All'); setMedia('All'); setMinSpend(0)
  }
  if (loading) return <Spinner label="Loading creatives…" />

  const dd = (label: string, value: string, set: (v: string) => void, opts: string[]) => (
    <Field label={label}>
      <select value={value} onChange={(e) => set(e.target.value)} className={SELECT_CLS}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )

  return (
    <div className="space-y-5">
      <KpiRow totals={totals} />

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <Field label="Search ad name">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter…" className={SELECT_CLS} />
          </Field>
          {dd('Persona', persona, setPersona, personas)}
          {dd('Concept', concept, setConcept, concepts)}
          {dd('Country', country, setCountry, countries)}
          {dd('OS / Device', device, setDevice, devices)}
          {dd('Media type', media, setMedia, medias)}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Min spend ($)">
            <input
              type="number"
              value={minSpend || ''}
              onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={`${SELECT_CLS} w-32`}
            />
          </Field>
          {hasFilters && (
            <button onClick={clear} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Clear filters
            </button>
          )}
          <span className="ml-auto self-center text-xs text-gray-400">
            Window: last {window}d · set via the timeframe picker
          </span>
        </div>
      </Card>

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
