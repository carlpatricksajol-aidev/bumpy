// Formatting + derived-metric helpers. All number formatting in the app goes
// through here so currency/percent/ratio rendering stays consistent.

import type { MetricRow } from './types'

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(value as string)
  return Number.isFinite(n) ? n : fallback
}

export function fmtCurrency(value: unknown, decimals = 0): string {
  const n = num(value)
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

/** Compact money: $12.0K, $1.2M */
export function fmtCompactCurrency(value: unknown, decimals = 1): string {
  const n = num(value)
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(decimals)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(decimals)}K`
  return `$${n.toFixed(0)}`
}

export function fmtInt(value: unknown): string {
  return Math.round(num(value)).toLocaleString('en-US')
}

export function fmtCompact(value: unknown, decimals = 1): string {
  const n = num(value)
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`
  return `${Math.round(n)}`
}

export function fmtPercent(value: unknown, decimals = 2): string {
  return `${(num(value) * 100).toFixed(decimals)}%`
}

/** Already-percent value (e.g. a change of 12.3 → "12.3%") */
export function fmtPercentRaw(value: unknown, decimals = 1): string {
  const n = num(value)
  return `${n > 0 ? '+' : ''}${n.toFixed(decimals)}%`
}

export function fmtRoas(value: unknown, decimals = 2): string {
  return `${num(value).toFixed(decimals)}x`
}

export function fmtNum(value: unknown, decimals = 2): string {
  return num(value).toFixed(decimals)
}

// ── Color thresholds ──────────────────────────────────────────────────────
export function roasTone(roas: number): 'good' | 'mid' | 'bad' {
  if (roas >= 2) return 'good'
  if (roas >= 1) return 'mid'
  return 'bad'
}

export const roasTextClass = (roas: number) =>
  ({ good: 'text-emerald-500', mid: 'text-amber-500', bad: 'text-rose-500' }[roasTone(roas)])

export function changeTextClass(pct: number | null | undefined): string {
  const n = num(pct)
  if (pct == null) return 'text-gray-400'
  if (n > 0) return 'text-emerald-500'
  if (n < 0) return 'text-rose-500'
  return 'text-gray-400'
}

// ── Budget utilization ────────────────────────────────────────────────────
/** % of the window's target budget actually spent. budget is a daily amount. */
export function budgetSpentPct(spend: number, dailyBudget: number | null | undefined, windowDays: number): number | null {
  const b = num(dailyBudget)
  if (b <= 0) return null
  const target = b * Math.max(windowDays, 1)
  return target > 0 ? (spend / target) * 100 : null
}

export function ageInDays(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return null
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000))
}

// ── Aggregation (for KPI totals + concept/persona grouping) ────────────────
export interface Totals {
  spend: number
  revenue: number
  impressions: number
  reach: number
  clicks: number
  link_clicks: number
  conversions: number
  prev_spend: number
  prev_revenue: number
  prev_conversions: number
  count: number
  roas: number
  cpm: number
  ctr: number
  cpc: number
  cpp: number
  cvr: number
  ipm: number
  pp10k: number
  avg_purchase: number
  spend_change_pct: number | null
  roas_change_pct: number | null
}

export function aggregate(rows: MetricRow[]): Totals {
  const t = rows.reduce(
    (a, r) => {
      a.spend += num(r.spend)
      a.revenue += num(r.revenue)
      a.impressions += num(r.impressions)
      a.reach += num(r.reach)
      a.clicks += num(r.clicks)
      a.link_clicks += num(r.link_clicks)
      a.conversions += num(r.conversions)
      a.prev_spend += num(r.prev_spend)
      a.prev_revenue += num(r.prev_revenue)
      a.prev_conversions += num(r.prev_conversions)
      a.count += 1
      return a
    },
    {
      spend: 0, revenue: 0, impressions: 0, reach: 0, clicks: 0, link_clicks: 0,
      conversions: 0, prev_spend: 0, prev_revenue: 0, prev_conversions: 0, count: 0,
    } as Totals,
  )
  t.roas = t.spend > 0 ? t.revenue / t.spend : 0
  t.cpm = t.impressions > 0 ? (t.spend / t.impressions) * 1000 : 0
  t.ctr = t.impressions > 0 ? t.clicks / t.impressions : 0
  t.cpc = t.clicks > 0 ? t.spend / t.clicks : 0
  t.cpp = t.conversions > 0 ? t.spend / t.conversions : 0
  t.cvr = t.clicks > 0 ? t.conversions / t.clicks : 0
  t.ipm = t.impressions / 1000
  t.pp10k = t.impressions > 0 ? (t.conversions / t.impressions) * 10000 : 0
  t.avg_purchase = t.conversions > 0 ? t.revenue / t.conversions : 0
  t.spend_change_pct = t.prev_spend > 0 ? ((t.spend - t.prev_spend) / t.prev_spend) * 100 : null
  const prevRoas = t.prev_spend > 0 ? t.prev_revenue / t.prev_spend : 0
  t.roas_change_pct = prevRoas > 0 ? ((t.roas - prevRoas) / prevRoas) * 100 : null
  return t
}

/** Group creative rows by an attribute (e.g. persona, concept_code) into pseudo MetricRows. */
export function groupBy(rows: MetricRow[], key: 'persona' | 'concept_code'): MetricRow[] {
  const buckets = new Map<string, MetricRow[]>()
  for (const r of rows) {
    const k = (r[key] || 'Unknown') as string
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(r)
  }
  const out: MetricRow[] = []
  for (const [k, group] of buckets) {
    const t = aggregate(group)
    out.push({
      window_days: group[0]?.window_days ?? 7,
      [key === 'persona' ? 'persona' : 'concept_code']: k,
      // surface the group name through ad_name so generic table/rowName works
      ad_name: k,
      spend: t.spend, revenue: t.revenue, impressions: t.impressions, reach: t.reach,
      clicks: t.clicks, link_clicks: t.link_clicks, conversions: t.conversions,
      prev_spend: t.prev_spend, prev_revenue: t.prev_revenue, prev_conversions: t.prev_conversions,
      prev_roas: t.prev_spend > 0 ? t.prev_revenue / t.prev_spend : 0,
      roas: t.roas, cpm: t.cpm, ctr: t.ctr, cpc: t.cpc, cpp: t.cpp, cvr: t.cvr,
      ipm: t.ipm, pp10k: t.pp10k, avg_purchase: t.avg_purchase, frequency: 0,
      spend_change_pct: t.spend_change_pct, conversions_change_pct: null,
      roas_change_pct: t.roas_change_pct,
      status: `${group.length} ads`,
    } as MetricRow)
  }
  return out.sort((a, b) => b.spend - a.spend)
}
