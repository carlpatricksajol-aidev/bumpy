'use client'
import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Card } from '@/components/ui'
import { useEntityDetail } from '@/components/detail/EntityDetail'
import { getYesterdayWinners } from '@/lib/queries'
import { fmtCurrency, fmtRoas, roasTextClass, num } from '@/lib/metrics'
import type { Level, YesterdayWinner } from '@/lib/types'

const LEVELS: { level: Level; title: string }[] = [
  { level: 'campaign', title: 'Campaigns' },
  { level: 'adset', title: 'Ad Sets' },
  { level: 'creative', title: 'Creatives' },
]

export default function YesterdayWinners() {
  const [rows, setRows] = useState<YesterdayWinner[]>([])
  const [loading, setLoading] = useState(true)
  const { open } = useEntityDetail()

  useEffect(() => {
    getYesterdayWinners().then((r) => {
      setRows(r.data)
      setLoading(false)
    })
  }, [])

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Yesterday&apos;s Winners</h3>
        <span className="text-xs text-gray-400">top ROAS · min $20 spend</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {LEVELS.map(({ level, title }) => {
          const top = rows.filter((r) => r.level === level).sort((a, b) => a.rank - b.rank).slice(0, 5)
          return (
            <div key={level}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</div>
              <div className="space-y-1.5">
                {loading && <div className="text-xs text-gray-400">Loading…</div>}
                {!loading && top.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400 dark:border-gray-700">
                    No qualifying spend yesterday.
                  </div>
                )}
                {top.map((w, i) => (
                  <button
                    key={w.entity_id}
                    onClick={() => open({ level, id: w.entity_id, name: w.name })}
                    className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-cyan-400 hover:bg-cyan-50/50 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-cyan-700 dark:hover:bg-cyan-900/10"
                  >
                    <span className="text-xs font-bold text-gray-300 dark:text-gray-600">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-200" title={w.name}>
                        {w.name}
                      </div>
                      <div className="text-[11px] text-gray-400">{fmtCurrency(w.spend)} spend</div>
                    </div>
                    <span className={`text-sm font-bold ${roasTextClass(num(w.roas))}`}>{fmtRoas(w.roas)}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
