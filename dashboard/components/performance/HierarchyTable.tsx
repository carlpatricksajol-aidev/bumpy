'use client'
import { useMemo, useState, Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTimeframe } from '@/components/providers'
import { useMetrics } from '@/components/useMetrics'
import { useEntityDetail } from '@/components/detail/EntityDetail'
import { Badge, Delta, deviceTone, Spinner } from '@/components/ui'
import { num, fmtCurrency, fmtInt, fmtPercent, fmtRoas, fmtNum, roasTextClass } from '@/lib/metrics'
import type { MetricRow, Level } from '@/lib/types'

const bySpend = (a: MetricRow, b: MetricRow) => num(b.spend) - num(a.spend)

export default function HierarchyTable() {
  const { window } = useTimeframe()
  const campaigns = useMetrics('campaign', window)
  const adsets = useMetrics('adset', window)
  const creatives = useMetrics('creative', window)
  const { open } = useEntityDetail()

  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set())
  const [openAdsets, setOpenAdsets] = useState<Set<string>>(new Set())

  const adsetsByCampaign = useMemo(() => {
    const m = new Map<string, MetricRow[]>()
    adsets.data.forEach((a) => {
      const k = a.campaign_id ?? ''
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(a)
    })
    m.forEach((v) => v.sort(bySpend))
    return m
  }, [adsets.data])

  const creativesByAdset = useMemo(() => {
    const m = new Map<string, MetricRow[]>()
    creatives.data.forEach((c) => {
      const k = c.adset_id ?? ''
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(c)
    })
    m.forEach((v) => v.sort(bySpend))
    return m
  }, [creatives.data])

  if (campaigns.loading) return <Spinner label="Loading campaigns…" />

  const sortedCampaigns = [...campaigns.data].sort(bySpend)

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setter(next)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
          <tr className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <th className="px-3 py-2.5 text-left">Campaign / Ad Set / Creative</th>
            <th className="px-3 py-2.5 text-left">Device</th>
            <th className="px-3 py-2.5 text-right">Spend</th>
            <th className="px-3 py-2.5 text-right">Δ</th>
            <th className="px-3 py-2.5 text-right">Revenue</th>
            <th className="px-3 py-2.5 text-right">ROAS</th>
            <th className="px-3 py-2.5 text-right">CPM</th>
            <th className="px-3 py-2.5 text-right">CTR</th>
            <th className="px-3 py-2.5 text-right">Conv</th>
            <th className="px-3 py-2.5 text-right">CPP</th>
            <th className="px-3 py-2.5 text-right">Freq</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {sortedCampaigns.map((c) => {
            const cid = c.campaign_id ?? ''
            const cOpen = openCampaigns.has(cid)
            const childAdsets = adsetsByCampaign.get(cid) ?? []
            return (
              <Fragment key={cid}>
                <Row
                  row={c}
                  depth={0}
                  name={c.campaign_name ?? 'Unknown'}
                  expandable={childAdsets.length > 0}
                  expanded={cOpen}
                  onToggle={() => toggle(openCampaigns, setOpenCampaigns, cid)}
                  onOpen={() => open({ level: 'campaign', id: cid, name: c.campaign_name })}
                />
                {cOpen &&
                  childAdsets.map((a) => {
                    const aid = a.adset_id ?? ''
                    const aOpen = openAdsets.has(aid)
                    const childCreatives = creativesByAdset.get(aid) ?? []
                    return (
                      <Fragment key={aid}>
                        <Row
                          row={a}
                          depth={1}
                          name={a.adset_name ?? 'Unknown'}
                          expandable={childCreatives.length > 0}
                          expanded={aOpen}
                          onToggle={() => toggle(openAdsets, setOpenAdsets, aid)}
                          onOpen={() => open({ level: 'adset', id: aid, name: a.adset_name })}
                        />
                        {aOpen &&
                          childCreatives.map((cr) => (
                            <Row
                              key={cr.ad_id}
                              row={cr}
                              depth={2}
                              name={cr.ad_name ?? 'Unknown'}
                              expandable={false}
                              onOpen={() => open({ level: 'creative', id: cr.ad_id ?? '', name: cr.ad_name })}
                            />
                          ))}
                      </Fragment>
                    )
                  })}
              </Fragment>
            )
          })}
          {sortedCampaigns.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-10 text-center text-sm text-gray-400">
                No campaign data for this window yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function Row({
  row, depth, name, expandable, expanded, onToggle, onOpen,
}: {
  row: MetricRow
  depth: 0 | 1 | 2
  name: string
  expandable: boolean
  expanded?: boolean
  onToggle?: () => void
  onOpen: () => void
}) {
  const bg = depth === 0 ? '' : depth === 1 ? 'bg-gray-50/60 dark:bg-gray-800/20' : 'bg-gray-100/50 dark:bg-gray-800/30'
  const cell = 'px-3 py-2 text-right tabular-nums'
  return (
    <tr className={`${bg} transition-colors hover:bg-cyan-50/40 dark:hover:bg-cyan-900/10`}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 18 }}>
          {expandable ? (
            <button onClick={onToggle} className="rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
              <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="inline-block w-5" />
          )}
          <button
            onClick={onOpen}
            className={`max-w-[260px] truncate text-left hover:text-cyan-600 hover:underline dark:hover:text-cyan-400 ${
              depth === 0 ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'
            }`}
            title={name}
          >
            {name}
          </button>
        </div>
      </td>
      <td className="px-3 py-2 text-left">
        <Badge tone={deviceTone(row.primary_device)}>{row.primary_device ?? '—'}</Badge>
      </td>
      <td className={`${cell} text-gray-700 dark:text-gray-200`}>{fmtCurrency(row.spend)}</td>
      <td className={cell}><Delta value={row.spend_change_pct} /></td>
      <td className={`${cell} text-gray-700 dark:text-gray-200`}>{fmtCurrency(row.revenue)}</td>
      <td className={`${cell} font-semibold ${roasTextClass(num(row.roas))}`}>{fmtRoas(row.roas)}</td>
      <td className={`${cell} text-gray-500 dark:text-gray-400`}>{fmtCurrency(row.cpm, 2)}</td>
      <td className={`${cell} text-gray-500 dark:text-gray-400`}>{fmtPercent(row.ctr)}</td>
      <td className={`${cell} text-gray-700 dark:text-gray-200`}>{fmtInt(row.conversions)}</td>
      <td className={`${cell} text-gray-500 dark:text-gray-400`}>{fmtCurrency(row.cpp, 2)}</td>
      <td className={`${cell} text-gray-500 dark:text-gray-400`}>{fmtNum(row.frequency)}</td>
    </tr>
  )
}
