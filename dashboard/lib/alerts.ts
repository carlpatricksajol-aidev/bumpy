// Pure alert-rule engine. Given metric rows (for a window) it returns actionable
// alerts. Runs on the REAL budget column now, so "not spending" is no longer the
// false-positive flood it was before.

import type { Level, MetricRow } from './types'
import { num, budgetSpentPct, ageInDays } from './metrics'

export type AlertSeverity = 'critical' | 'warning' | 'opportunity' | 'success'
export type AlertCategory = 'winner' | 'contender' | 'fatigued' | 'not-spending' | 'declining' | 'losing-money'

export const CATEGORY_LABEL: Record<AlertCategory, string> = {
  'losing-money': 'Losing money',
  fatigued: 'Fatigued',
  'not-spending': 'Not spending',
  declining: 'ROAS declining',
  contender: 'Contenders',
  winner: 'Winners',
}

// Order shown on the Alerts page (worst / most-urgent first).
export const CATEGORY_ORDER: AlertCategory[] = [
  'losing-money', 'fatigued', 'not-spending', 'declining', 'contender', 'winner',
]

export interface Alert {
  id: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  message: string
  action: string
  level: Level
  entityId: string
  entityName: string
  country?: string | null
  device?: string | null
  roas: number
  spend: number
  changePct: number | null
  budgetPct: number | null
  ageDays: number | null
}

const MIN_SPEND: Record<Level, number> = { campaign: 200, adset: 50, creative: 20 }

const LABEL: Record<Level, string> = { campaign: 'Campaign', adset: 'Ad Set', creative: 'Creative' }

function evaluate(level: Level, rows: MetricRow[]): Alert[] {
  const out: Alert[] = []
  const minSpend = MIN_SPEND[level]
  const idOf = (r: MetricRow) => r.campaign_id ?? r.adset_id ?? r.ad_id ?? ''
  const nameOf = (r: MetricRow) => r.campaign_name ?? r.adset_name ?? r.ad_name ?? 'Unknown'

  for (const r of rows) {
    const status = (r.status || '').toUpperCase()
    const active = status === 'ACTIVE'
    const spend = num(r.spend)
    const roas = num(r.roas)
    const freq = num(r.frequency)
    const change = r.roas_change_pct
    const budgetPct = budgetSpentPct(spend, r.budget, r.window_days)
    const age = ageInDays(r.created_at)
    const id = idOf(r)
    const name = nameOf(r)
    const base = {
      level, entityId: id, entityName: name,
      country: r.primary_country, device: r.primary_device,
      roas, spend, changePct: change ?? null, budgetPct, ageDays: age,
    }

    // NOT SPENDING — only when budget is known, so it's a real signal now.
    if (active && budgetPct != null && budgetPct < 50 && spend < minSpend) {
      out.push({
        ...base, id: `not-spending-${level}-${id}`, severity: 'critical', category: 'not-spending',
        title: 'Not spending — delete candidate',
        message: `${LABEL[level]} "${name}" used only ${budgetPct.toFixed(0)}% of its budget.`,
        action: 'Add to the bulk-deletion list — it is not delivering.',
      })
      continue
    }

    // FATIGUED — high frequency AND declining ROAS while still spending.
    if (active && freq > 3 && num(change) < -10 && spend > minSpend) {
      out.push({
        ...base, id: `fatigued-${level}-${id}`, severity: 'critical', category: 'fatigued',
        title: 'Fatigued — audience over-exposed',
        message: `${LABEL[level]} "${name}" — frequency ${freq.toFixed(1)}, ROAS ${num(change).toFixed(0)}% vs prior period.`,
        action: 'Pause or refresh creative. The audience has seen this too many times.',
      })
      continue
    }

    // LOSING MONEY — spending meaningfully but returning less than it costs.
    if (active && roas < 0.8 && spend > minSpend) {
      out.push({
        ...base, id: `losing-${level}-${id}`, severity: 'critical', category: 'losing-money',
        title: 'Losing money',
        message: `${LABEL[level]} "${name}" is at ${roas.toFixed(2)}x ROAS on ${`$${spend.toFixed(0)}`} — returning less than it spends.`,
        action: 'Cut it, or fix targeting/creative before it burns more budget.',
      })
      continue
    }

    // TOP PERFORMER
    if (active && roas >= 3 && spend > minSpend * 2) {
      out.push({
        ...base, id: `top-${level}-${id}`, severity: 'success', category: 'winner',
        title: 'Top performer',
        message: `${LABEL[level]} "${name}" is delivering ${roas.toFixed(2)}x ROAS on ${`$${spend.toFixed(0)}`} spend.`,
        action: 'Document what works and replicate to other markets/audiences.',
      })
      continue
    }

    // WINNER — scale
    if (active && roas >= 2.5 && spend > minSpend && (budgetPct == null || budgetPct >= 70)) {
      out.push({
        ...base, id: `winner-${level}-${id}`, severity: 'opportunity', category: 'winner',
        title: 'Winner — ready to scale',
        message: `${LABEL[level]} "${name}" is a proven winner at ${roas.toFixed(2)}x ROAS.`,
        action: 'Increase budget 50–100% (or duplicate at a higher budget).',
      })
      continue
    }

    // DECLINING — sharp ROAS drop while spending
    if (active && num(change) < -25 && spend > minSpend) {
      out.push({
        ...base, id: `declining-${level}-${id}`, severity: 'warning', category: 'declining',
        title: 'ROAS declining',
        message: `${LABEL[level]} "${name}" ROAS down ${num(change).toFixed(0)}% vs the prior period (now ${roas.toFixed(2)}x).`,
        action: 'Investigate before it becomes fatigued — check frequency and creative age.',
      })
      continue
    }

    // CONTENDER — young and promising
    if (active && age != null && age < 14 && roas >= 1 && roas < 2.5 && spend > minSpend) {
      out.push({
        ...base, id: `contender-${level}-${id}`, severity: 'warning', category: 'contender',
        title: 'Contender — monitor',
        message: `${LABEL[level]} "${name}" (${age}d old) at ${roas.toFixed(2)}x ROAS.`,
        action: 'Give it 7 more days. If ROAS holds >2x, scale; if it drops, cut.',
      })
    }
  }
  return out
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, opportunity: 2, success: 3 }

export function buildAlerts(input: { campaigns: MetricRow[]; adsets: MetricRow[]; creatives: MetricRow[] }): Alert[] {
  const all = [
    ...evaluate('campaign', input.campaigns),
    ...evaluate('adset', input.adsets),
    ...evaluate('creative', input.creatives),
  ]
  return all.sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    return s !== 0 ? s : b.spend - a.spend
  })
}

export function alertCounts(alerts: Alert[]) {
  return {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    opportunity: alerts.filter((a) => a.severity === 'opportunity').length,
    success: alerts.filter((a) => a.severity === 'success').length,
  }
}
