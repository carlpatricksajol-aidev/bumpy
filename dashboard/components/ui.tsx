'use client'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { changeTextClass, fmtPercentRaw } from '@/lib/metrics'

export const card =
  'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`${card} ${className}`}>{children}</div>
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-12">
      <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-cyan-500" />
      {label && <span className="text-gray-500 dark:text-gray-400">{label}</span>}
    </div>
  )
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="p-12 text-center">
      {icon && <div className="mb-3 flex justify-center text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {hint && <p className="mx-auto mt-1 max-w-lg text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
    </Card>
  )
}

type BadgeTone = 'gray' | 'green' | 'amber' | 'rose' | 'blue' | 'cyan' | 'purple'
const toneMap: Record<BadgeTone, string> = {
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}
export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneMap[tone]}`}>{children}</span>
}

export function deviceTone(device?: string | null): BadgeTone {
  if (device === 'iOS') return 'gray'
  if (device === 'Android') return 'green'
  if (device === 'Desktop') return 'blue'
  return 'gray'
}

/** A small "+12.3% / -4.1%" delta with color. */
export function Delta({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-gray-400">—</span>
  return <span className={changeTextClass(value)}>{fmtPercentRaw(value)}</span>
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs">{sub}</div>}
    </Card>
  )
}

export function Modal({ open, onClose, children, maxWidth = 'max-w-4xl' }: {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 animate-fade-in sm:p-8" onClick={onClose}>
      <div
        className={`relative my-4 w-full ${maxWidth} animate-scale-in rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
