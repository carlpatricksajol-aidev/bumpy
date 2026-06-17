'use client'
import { useMemo, useState } from 'react'
import {
  AlertTriangle, TrendingDown, Zap, CheckCircle2, ChevronRight, ChevronDown,
  Banknote, Ban, Eye, Trophy, type LucideIcon,
} from 'lucide-react'
import { useTimeframe } from '@/components/providers'
import { useMetrics } from '@/components/useMetrics'
import { useEntityDetail } from '@/components/detail/EntityDetail'
import { Card, Spinner, EmptyState } from '@/components/ui'
import {
  buildAlerts, alertCounts, CATEGORY_LABEL, CATEGORY_ORDER,
  type Alert, type AlertSeverity, type AlertCategory,
} from '@/lib/alerts'
import type { Level } from '@/lib/types'
import { fmtCompactCurrency, fmtCurrency, fmtPercentRaw, fmtRoas } from '@/lib/metrics'

const SEV = {
  critical: { label: 'Critical', text: 'text-rose-500', Icon: AlertTriangle },
  warning: { label: 'Warning', text: 'text-amber-500', Icon: TrendingDown },
  opportunity: { label: 'Opportunity', text: 'text-blue-500', Icon: Zap },
  success: { label: 'Success', text: 'text-emerald-500', Icon: CheckCircle2 },
} as const

const CAT_META: Record<AlertCategory, { tone: string; ring: string; Icon: LucideIcon }> = {
  'losing-money': { tone: 'text-rose-500', ring: 'border-rose-300 dark:border-rose-900/60', Icon: Banknote },
  fatigued: { tone: 'text-rose-500', ring: 'border-rose-300 dark:border-rose-900/60', Icon: AlertTriangle },
  'not-spending': { tone: 'text-rose-400', ring: 'border-rose-200 dark:border-rose-900/50', Icon: Ban },
  declining: { tone: 'text-amber-500', ring: 'border-amber-300 dark:border-amber-900/60', Icon: TrendingDown },
  contender: { tone: 'text-amber-500', ring: 'border-amber-300 dark:border-amber-900/60', Icon: Eye },
  winner: { tone: 'text-emerald-500', ring: 'border-emerald-300 dark:border-emerald-900/60', Icon: Trophy },
}

const LEVELS: { id: Level | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'campaign', label: 'Campaigns' },
  { id: 'adset', label: 'Ad Sets' },
  { id: 'creative', label: 'Creatives' },
]

const PER_GROUP = 6

export default function AlertsPage() {
  const { window } = useTimeframe()
  const campaigns = useMetrics('campaign', window)
  const adsets = useMetrics('adset', window)
  const creatives = useMetrics('creative', window)
  const { open } = useEntityDetail()

  const [sev, setSev] = useState<AlertSeverity | 'all'>('all')
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [collapsed, setCollapsed] = useState<Set<AlertCategory>>(new Set())
  const [showAll, setShowAll] = useState<Set<AlertCategory>>(new Set())

  const loading = campaigns.loading || adsets.loading || creatives.loading
  const alerts = useMemo(
    () => buildAlerts({ campaigns: campaigns.data, adsets: adsets.data, creatives: creatives.data }),
    [campaigns.data, adsets.data, creatives.data],
  )

  const levelScoped = useMemo(() => (level === 'all' ? alerts : alerts.filter((a) => a.level === level)), [alerts, level])
  const counts = useMemo(() => alertCounts(levelScoped), [levelScoped])
  const shown = useMemo(() => (sev === 'all' ? levelScoped : levelScoped.filter((a) => a.severity === sev)), [levelScoped, sev])

  const levelCounts = useMemo(() => ({
    all: alerts.length,
    campaign: alerts.filter((a) => a.level === 'campaign').length,
    adset: alerts.filter((a) => a.level === 'adset').length,
    creative: alerts.filter((a) => a.level === 'creative').length,
  }), [alerts])

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        cat,
        items: shown.filter((a) => a.category === cat).sort((a, b) => b.spend - a.spend),
      })).filter((g) => g.items.length > 0),
    [shown],
  )

  if (loading) return <Spinner label="Analyzing performance…" />

  const toggle = (set: Set<AlertCategory>, setter: (s: Set<AlertCategory>) => void, c: AlertCategory) => {
    const n = new Set(set)
    n.has(c) ? n.delete(c) : n.add(c)
    setter(n)
  }

  return (
    <div className="space-y-5">
      {/* severity summary / filter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(SEV) as AlertSeverity[]).map((s) => {
          const m = SEV[s]
          const active = sev === s
          return (
            <button
              key={s}
              onClick={() => setSev(active ? 'all' : s)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                active ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-gray-200 dark:border-gray-800'
              } bg-white dark:bg-gray-900/60`}
            >
              <m.Icon className={`h-6 w-6 ${m.text}`} />
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{m.label}</div>
                <div className={`text-2xl font-bold ${m.text}`}>{counts[s]}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* level filter + active-filter hint */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-800 dark:bg-gray-800/60">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                level === l.id ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {l.label} <span className="opacity-60">{levelCounts[l.id]}</span>
            </button>
          ))}
        </div>
        {(sev !== 'all' || level !== 'all') && (
          <button
            onClick={() => { setSev('all'); setLevel('all') }}
            className="text-sm text-cyan-600 hover:underline dark:text-cyan-400"
          >
            Clear filters
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Nothing to flag here" hint="No alerts match this filter, or there's no data for this window yet." />
      ) : (
        groups.map(({ cat, items }) => {
          const meta = CAT_META[cat]
          const isCollapsed = collapsed.has(cat)
          const showingAll = showAll.has(cat)
          const visible = showingAll ? items : items.slice(0, PER_GROUP)
          const totalSpend = items.reduce((s, a) => s + a.spend, 0)
          return (
            <Card key={cat} className={`border ${meta.ring} overflow-hidden`}>
              <button
                onClick={() => toggle(collapsed, setCollapsed, cat)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <div className="flex items-center gap-3">
                  <meta.Icon className={`h-5 w-5 ${meta.tone}`} />
                  <span className="font-semibold text-gray-900 dark:text-white">{CATEGORY_LABEL[cat]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${meta.tone} bg-gray-100 dark:bg-gray-800`}>{items.length}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{fmtCompactCurrency(totalSpend)} spend</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </div>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                  {visible.map((a) => (
                    <AlertRow key={a.id} a={a} onOpen={() => open({ level: a.level, id: a.entityId, name: a.entityName })} />
                  ))}
                  {items.length > PER_GROUP && (
                    <button
                      onClick={() => toggle(showAll, setShowAll, cat)}
                      className="w-full px-5 py-2.5 text-sm font-medium text-cyan-600 transition-colors hover:bg-gray-50 dark:text-cyan-400 dark:hover:bg-gray-800/40"
                    >
                      {showingAll ? 'Show less' : `Show all ${items.length}`}
                    </button>
                  )}
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}

function AlertRow({ a, onOpen }: { a: Alert; onOpen: () => void }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100" title={a.entityName}>
          <span className="uppercase text-[10px] text-gray-400">{a.level}</span> · {a.entityName}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span className={a.roas >= 1 ? 'text-emerald-500' : 'text-rose-500'}>{fmtRoas(a.roas)}</span>
          <span>{fmtCurrency(a.spend)}</span>
          {a.changePct != null && <span>{fmtPercentRaw(a.changePct)} ROAS</span>}
          {a.budgetPct != null && <span>{a.budgetPct.toFixed(0)}% budget</span>}
          {a.device && <span>{a.device}</span>}
          <span className="text-gray-400">— {a.action}</span>
        </div>
      </div>
      <button
        onClick={onOpen}
        className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-cyan-600 transition-colors hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900/20"
      >
        View <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
