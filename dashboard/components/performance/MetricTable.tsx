'use client'
import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MetricRow } from '@/lib/types'

export interface Column {
  key: string
  label: string
  align?: 'left' | 'right'
  sortBy: (r: MetricRow) => number | string
  render: (r: MetricRow) => ReactNode
}

interface Props {
  rows: MetricRow[]
  columns: Column[]
  rowKey: (r: MetricRow) => string
  onRowClick?: (r: MetricRow) => void
  defaultSortKey?: string
}

export default function MetricTable({ rows, columns, rowKey, onRowClick, defaultSortKey = 'spend' }: Props) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return rows
    return [...rows].sort((a, b) => {
      const va = col.sortBy(a)
      const vb = col.sortBy(b)
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va
      return dir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
  }, [rows, columns, sortKey, dir])

  const toggle = (key: string) => {
    if (sortKey === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setDir('desc')
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => toggle(c.key)}
                className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-400 ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.align === 'right' && <SortGlyph active={sortKey === c.key} dir={dir} />}
                  {c.label}
                  {c.align !== 'right' && <SortGlyph active={sortKey === c.key} dir={dir} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={() => onRowClick?.(r)}
              className={`${onRowClick ? 'cursor-pointer' : ''} transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-2.5 tabular-nums ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-gray-400">
                No rows for this window yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SortGlyph({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronDown className="h-3 w-3 text-gray-300 dark:text-gray-600" />
  return dir === 'asc' ? (
    <ChevronUp className="h-3 w-3 text-cyan-500" />
  ) : (
    <ChevronDown className="h-3 w-3 text-cyan-500" />
  )
}
