// All Supabase reads live here. The dashboard reads metrics from the SQL views
// (v_*_metrics, v_yesterday_winners) and trend points from the *_daily tables.

import { supabase } from './supabase'
import type { Level, MetricRow, DailyPoint, YesterdayWinner, WindowDays } from './types'

const METRIC_VIEW: Record<Level, string> = {
  campaign: 'v_campaign_metrics',
  adset: 'v_adset_metrics',
  creative: 'v_creative_metrics',
}

const DAILY_TABLE: Record<Level, { table: string; idCol: string }> = {
  campaign: { table: 'campaign_daily', idCol: 'campaign_id' },
  adset: { table: 'adset_daily', idCol: 'adset_id' },
  creative: { table: 'creative_daily', idCol: 'ad_id' },
}

const ID_COL: Record<Level, string> = { campaign: 'campaign_id', adset: 'adset_id', creative: 'ad_id' }

export interface QueryResult<T> {
  data: T
  error: string | null
}

/** Page through a Supabase table/view in 1000-row chunks (PostgREST hard cap). */
async function fetchAll(view: string, applyFilter?: (q: any) => any): Promise<{ rows: any[]; error: string | null }> {
  const PAGE = 1000
  let from = 0
  const rows: any[] = []
  for (;;) {
    let q = supabase.from(view).select('*').range(from, from + PAGE - 1)
    if (applyFilter) q = applyFilter(q)
    const { data, error } = await q
    if (error) return { rows, error: error.message }
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return { rows, error: null }
}

export async function getMetrics(level: Level, window: WindowDays): Promise<QueryResult<MetricRow[]>> {
  const { rows, error } = await fetchAll(METRIC_VIEW[level], (q) => q.eq('window_days', window))
  if (error) console.error(`[queries] getMetrics(${level}, ${window}):`, error)
  return { data: rows as MetricRow[], error }
}

/** All windows (1/7/14/28/30/60) for a single entity — powers the detail modal. */
export async function getEntityMetrics(level: Level, id: string): Promise<QueryResult<MetricRow[]>> {
  const { data, error } = await supabase.from(METRIC_VIEW[level]).select('*').eq(ID_COL[level], id)
  if (error) console.error(`[queries] getEntityMetrics(${level}, ${id}):`, error.message)
  return { data: (data ?? []) as MetricRow[], error: error?.message ?? null }
}

export async function getDaily(level: Level, entityId: string): Promise<QueryResult<DailyPoint[]>> {
  const { table, idCol } = DAILY_TABLE[level]
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(idCol, entityId)
    .order('date', { ascending: true })
  if (error) console.error(`[queries] getDaily(${level}, ${entityId}):`, error.message)
  return { data: (data ?? []) as DailyPoint[], error: error?.message ?? null }
}

export async function getYesterdayWinners(): Promise<QueryResult<YesterdayWinner[]>> {
  const { data, error } = await supabase
    .from('v_yesterday_winners')
    .select('*')
    .order('rank', { ascending: true })
  if (error) console.error('[queries] getYesterdayWinners:', error.message)
  return { data: (data ?? []) as YesterdayWinner[], error: error?.message ?? null }
}

/** Raw weekly persona report (CSV-import table with human-readable columns). */
export async function getPersonaReport(): Promise<QueryResult<any[]>> {
  const { data, error } = await supabase
    .from('creative_persona_report')
    .select('*')
    .order('Week', { ascending: false })
  if (error) console.error('[queries] getPersonaReport:', error.message)
  return { data: data ?? [], error: error?.message ?? null }
}

export interface PortfolioPoint { date: string; spend: number; revenue: number; conversions: number; roas: number }

/** Account-wide daily totals (sum of campaign_daily by date) for the overview trend. */
export async function getPortfolioDaily(): Promise<QueryResult<PortfolioPoint[]>> {
  const { rows, error } = await fetchAll('campaign_daily')
  const map = new Map<string, PortfolioPoint>()
  for (const r of rows) {
    const d = r.date as string
    if (!map.has(d)) map.set(d, { date: d, spend: 0, revenue: 0, conversions: 0, roas: 0 })
    const o = map.get(d)!
    o.spend += Number(r.spend) || 0
    o.revenue += Number(r.revenue) || 0
    o.conversions += Number(r.conversions) || 0
  }
  const data = [...map.values()]
    .map((p) => ({ ...p, roas: p.spend > 0 ? p.revenue / p.spend : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))
  return { data, error }
}

export function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
