'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle, TrendingDown, Zap, CheckCircle2, ChevronRight } from 'lucide-react'
import { useTimeframe } from '@/components/providers'
import { useMetrics } from '@/components/useMetrics'
import { useEntityDetail } from '@/components/detail/EntityDetail'
import { Card, Spinner, EmptyState } from '@/components/ui'
import { buildAlerts, alertCounts, type Alert, type AlertSeverity } from '@/lib/alerts'
import { fmtCurrency, fmtPercentRaw, fmtRoas } from '@/lib/metrics'

const SEV = {
  critical: { label: 'Critical', ring: 'border-rose-300 dark:border-rose-900/60', bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', Icon: AlertTriangle },
  warning: { label: 'Warning', ring: 'border-amber-300 dark:border-amber-900/60', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', Icon: TrendingDown },
  opportunity: { label: 'Opportunity', ring: 'border-blue-300 dark:border-blue-900/60', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', Icon: Zap },
  success: { label: 'Success', ring: 'border-emerald-300 dark:border-emerald-900/60', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', Icon: CheckCircle2 },
} as const

export default function AlertsPage() {
  const { window } = useTimeframe()
  const campaigns = useMetrics('campaign', window)
  const adsets = useMetrics('adset', window)
  const creatives = useMetrics('creative', window)
  const { open } = useEntityDetail()
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all')

  const loading = campaigns.loading || adsets.loading || creatives.loading
  const alerts = useMemo(
    () => buildAlerts({ campaigns: campaigns.data, adsets: adsets.data, creatives: creatives.data }),
    [campaigns.data, adsets.data, creatives.data],
  )
  const counts = useMemo(() => alertCounts(alerts), [alerts])
  const shown = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)

  if (loading) return <Spinner label="Analyzing performance…" />

  return (
    <div className="space-y-5">
      {/* severity summary / filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(SEV) as AlertSeverity[]).map((sev) => {
          const s = SEV[sev]
          const active = filter === sev
          return (
            <button
              key={sev}
              onClick={() => setFilter(active ? 'all' : sev)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${s.ring} ${s.bg} ${active ? 'ring-2 ring-offset-1 ring-cyan-400 dark:ring-offset-gray-950' : ''}`}
            >
              <s.Icon className={`h-6 w-6 ${s.text}`} />
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</div>
                <div className={`text-2xl font-bold ${s.text}`}>{counts[sev]}</div>
              </div>
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No alerts in this view" hint="Either everything is healthy or there's no data for this window yet." />
      ) : (
        <div className="space-y-3">
          {shown.map((a) => (
            <AlertCard key={a.id} alert={a} onOpen={() => open({ level: a.level, id: a.entityId, name: a.entityName })} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert, onOpen }: { alert: Alert; onOpen: () => void }) {
  const s = SEV[alert.severity]
  return (
    <Card className={`border ${s.ring} ${s.bg} p-5`}>
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 shrink-0 ${s.text}`}>
          <s.Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">{alert.title}</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${s.text} ${s.bg}`}>
              {alert.level} · {alert.category.replace('-', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{alert.message}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>ROAS {fmtRoas(alert.roas)}</span>
            <span>·</span>
            <span>{fmtCurrency(alert.spend)} spend</span>
            {alert.changePct != null && (<><span>·</span><span>{fmtPercentRaw(alert.changePct)} ROAS</span></>)}
            {alert.budgetPct != null && (<><span>·</span><span>{alert.budgetPct.toFixed(0)}% budget</span></>)}
            {alert.ageDays != null && (<><span>·</span><span>{alert.ageDays}d old</span></>)}
            {alert.device && (<><span>·</span><span>{alert.device}</span></>)}
            {alert.country && (<><span>·</span><span>{alert.country}</span></>)}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <div className="text-[10px] font-medium uppercase text-gray-400">Recommended action</div>
              <div className={`text-sm font-semibold ${s.text}`}>{alert.action}</div>
            </div>
            <button
              onClick={onOpen}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-cyan-600 transition-colors hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900/20"
            >
              View <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
