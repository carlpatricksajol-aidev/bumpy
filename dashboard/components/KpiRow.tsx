'use client'
import { StatTile, Delta } from '@/components/ui'
import type { Totals } from '@/lib/metrics'
import { fmtCompactCurrency, fmtCurrency, fmtInt, fmtPercent, fmtRoas, roasTextClass } from '@/lib/metrics'

export default function KpiRow({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      <StatTile label="Spend" value={fmtCompactCurrency(totals.spend)} sub={<Delta value={totals.spend_change_pct} />} />
      <StatTile label="Revenue" value={fmtCompactCurrency(totals.revenue)} />
      <StatTile
        label="ROAS"
        value={<span className={roasTextClass(totals.roas)}>{fmtRoas(totals.roas)}</span>}
        sub={<Delta value={totals.roas_change_pct} />}
      />
      <StatTile label="Conversions" value={fmtInt(totals.conversions)} />
      <StatTile label="CPM" value={fmtCurrency(totals.cpm, 2)} />
      <StatTile label="CTR" value={fmtPercent(totals.ctr)} />
      <StatTile label="CPP" value={fmtCurrency(totals.cpp, 2)} />
      <StatTile label="PP10K" value={totals.pp10k.toFixed(1)} />
    </div>
  )
}
