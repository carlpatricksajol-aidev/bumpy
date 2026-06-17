// Shared types for the Bumpy dashboard data layer.
// These mirror the SQL views in db/03_views.sql (the read contract).

export type Level = 'campaign' | 'adset' | 'creative'
export type GroupLevel = Level | 'concept' | 'persona'
export type WindowDays = 1 | 7 | 14 | 28 | 30 | 60

export const WINDOWS: { value: WindowDays; label: string; short: string }[] = [
  { value: 1, label: 'Yesterday', short: '1d' },
  { value: 7, label: 'Last 7 days', short: '7d' },
  { value: 14, label: 'Last 14 days', short: '14d' },
  { value: 28, label: 'Last 28 days', short: '28d' },
  { value: 30, label: 'Last 30 days', short: '30d' },
  { value: 60, label: 'Last 60 days', short: '60d' },
]

// One row of v_<level>_metrics for a single window_days.
export interface MetricRow {
  // identity / attributes (presence depends on level)
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
  persona?: string | null
  concept_code?: string | null
  media_type?: string | null
  batch?: string | null
  language?: string | null
  status?: string | null
  primary_country?: string | null
  primary_device?: string | null
  budget?: number | null
  created_at?: string | null
  country_breakdown?: Record<string, number> | null
  device_breakdown?: Record<string, number> | null
  thumbnail_url?: string | null
  permalink?: string | null
  video_id?: string | null

  window_days: number

  // raw additive counters (window sums)
  spend: number
  revenue: number
  impressions: number
  reach: number
  clicks: number
  link_clicks: number
  conversions: number
  app_installs?: number
  video_plays?: number
  thruplays?: number

  // previous equal-length window (for change %)
  prev_spend: number
  prev_revenue: number
  prev_conversions: number
  prev_roas: number

  // derived (computed in the view)
  roas: number
  cpm: number
  ctr: number
  cpc: number
  cpp: number
  cvr: number
  ipm: number
  pp10k: number
  avg_purchase: number
  frequency: number
  hook_rate?: number
  hold_rate?: number
  spend_change_pct: number | null
  conversions_change_pct: number | null
  roas_change_pct: number | null
}

// A single day from a *_daily table (for trend charts in the detail modal).
export interface DailyPoint {
  date: string
  spend: number
  revenue: number
  impressions: number
  reach: number
  clicks: number
  link_clicks: number
  conversions: number
  frequency: number
  purchase_roas: number
  video_plays?: number
  thruplays?: number
}

export interface YesterdayWinner {
  level: Level
  entity_id: string
  name: string
  parent_id: string | null
  spend: number
  revenue: number
  conversions: number
  roas: number
  rank: number
}

// Unique id for any metric row, regardless of level.
export function rowId(row: MetricRow): string {
  return row.ad_id ?? row.adset_id ?? row.campaign_id ?? ''
}

export function rowName(row: MetricRow): string {
  return row.ad_name ?? row.adset_name ?? row.campaign_name ?? 'Unknown'
}
