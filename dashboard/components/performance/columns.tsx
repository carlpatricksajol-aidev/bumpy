'use client'
import type { Column } from './MetricTable'
import type { MetricRow } from '@/lib/types'
import { Badge, Delta, deviceTone } from '@/components/ui'
import { num, fmtCurrency, fmtInt, fmtPercent, fmtRoas, fmtNum, roasTextClass } from '@/lib/metrics'

const money = (k: keyof MetricRow, label: string): Column => ({
  key: k as string, label, align: 'right',
  sortBy: (r) => num(r[k]),
  render: (r) => <span className="text-gray-700 dark:text-gray-200">{fmtCurrency(r[k])}</span>,
})

const roasCol: Column = {
  key: 'roas', label: 'ROAS', align: 'right',
  sortBy: (r) => num(r.roas),
  render: (r) => <span className={`font-semibold ${roasTextClass(num(r.roas))}`}>{fmtRoas(r.roas)}</span>,
}

const deltaCol: Column = {
  key: 'spend_change_pct', label: 'Δ Spend', align: 'right',
  sortBy: (r) => num(r.spend_change_pct),
  render: (r) => <Delta value={r.spend_change_pct} />,
}

const conv: Column = {
  key: 'conversions', label: 'Conv', align: 'right',
  sortBy: (r) => num(r.conversions),
  render: (r) => <span className="text-gray-700 dark:text-gray-200">{fmtInt(r.conversions)}</span>,
}

const ctr: Column = {
  key: 'ctr', label: 'CTR', align: 'right',
  sortBy: (r) => num(r.ctr),
  render: (r) => <span className="text-gray-500 dark:text-gray-400">{fmtPercent(r.ctr)}</span>,
}

const cpm: Column = {
  key: 'cpm', label: 'CPM', align: 'right',
  sortBy: (r) => num(r.cpm),
  render: (r) => <span className="text-gray-500 dark:text-gray-400">{fmtCurrency(r.cpm, 2)}</span>,
}

const cpp: Column = {
  key: 'cpp', label: 'CPP', align: 'right',
  sortBy: (r) => num(r.cpp),
  render: (r) => <span className="text-gray-500 dark:text-gray-400">{fmtCurrency(r.cpp, 2)}</span>,
}

const freq: Column = {
  key: 'frequency', label: 'Freq', align: 'right',
  sortBy: (r) => num(r.frequency),
  render: (r) => <span className="text-gray-500 dark:text-gray-400">{fmtNum(r.frequency)}</span>,
}

const device: Column = {
  key: 'primary_device', label: 'Device', align: 'left',
  sortBy: (r) => r.primary_device ?? '',
  render: (r) => <Badge tone={deviceTone(r.primary_device)}>{r.primary_device ?? '—'}</Badge>,
}

const country: Column = {
  key: 'primary_country', label: 'Country', align: 'left',
  sortBy: (r) => r.primary_country ?? '',
  render: (r) => <span className="text-gray-500 dark:text-gray-400">{r.primary_country ?? '—'}</span>,
}

function nameCol(get: (r: MetricRow) => string, sub?: (r: MetricRow) => string | null): Column {
  return {
    key: 'name', label: 'Name', align: 'left',
    sortBy: (r) => get(r),
    render: (r) => (
      <div className="max-w-[280px]">
        <div className="truncate font-medium text-gray-900 dark:text-gray-100" title={get(r)}>{get(r)}</div>
        {sub && sub(r) && <div className="truncate text-xs text-gray-400">{sub(r)}</div>}
      </div>
    ),
  }
}

export const campaignColumns: Column[] = [
  nameCol((r) => r.campaign_name ?? 'Unknown'),
  device, country, money('spend', 'Spend'), deltaCol, money('revenue', 'Revenue'),
  roasCol, cpm, ctr, conv, cpp, freq,
]

export const adsetColumns: Column[] = [
  nameCol((r) => r.adset_name ?? 'Unknown', (r) => r.persona ?? null),
  device, country, money('spend', 'Spend'), deltaCol, money('revenue', 'Revenue'),
  roasCol, cpm, ctr, conv, cpp, freq,
]

export const creativeColumns: Column[] = [
  nameCol((r) => r.ad_name ?? 'Unknown', (r) => [r.persona, r.concept_code].filter(Boolean).join(' · ') || null),
  {
    key: 'status', label: 'Perf', align: 'left',
    sortBy: (r) => r.status ?? '',
    render: (r) => <Badge tone={r.status === 'ACTIVE' ? 'green' : 'gray'}>{r.status ?? '—'}</Badge>,
  },
  money('spend', 'Spend'), deltaCol, money('revenue', 'Revenue'), roasCol, conv, cpp, ctr, freq,
]

// concept / persona groups (rows are aggregates; name comes through ad_name)
export const groupColumns = (kind: 'concept' | 'persona'): Column[] => [
  nameCol((r) => (kind === 'persona' ? r.persona : r.concept_code) || 'Unknown'),
  {
    key: 'status', label: 'Ads', align: 'left',
    sortBy: (r) => r.status ?? '',
    render: (r) => <span className="text-xs text-gray-400">{r.status}</span>,
  },
  money('spend', 'Spend'), deltaCol, money('revenue', 'Revenue'), roasCol, conv, cpp, ctr,
]
