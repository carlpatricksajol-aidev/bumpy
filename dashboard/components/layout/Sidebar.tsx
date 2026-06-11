'use client'
import Image from 'next/image'
import {
  LayoutDashboard, Bell, Megaphone, Layers, Image as ImageIcon,
  Lightbulb, Users, ScatterChart, FileText, Settings as SettingsIcon, type LucideIcon,
} from 'lucide-react'

export type Section =
  | 'overview' | 'alerts'
  | 'campaigns' | 'adsets' | 'creatives' | 'concept' | 'persona'
  | 'explorer' | 'personaReport' | 'settings'

interface NavItem { id: Section; label: string; icon: LucideIcon }
interface NavGroup { heading?: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { items: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ] },
  { heading: 'Performance', items: [
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'adsets', label: 'Ad Sets', icon: Layers },
    { id: 'creatives', label: 'Creatives', icon: ImageIcon },
    { id: 'concept', label: 'By Concept', icon: Lightbulb },
    { id: 'persona', label: 'By Persona', icon: Users },
  ] },
  { heading: 'Explore', items: [
    { id: 'explorer', label: 'Creative Explorer', icon: ScatterChart },
    { id: 'personaReport', label: 'Persona Report', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] },
]

export default function Sidebar({ active, onSelect }: { active: Section; onSelect: (s: Section) => void }) {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/bumpy-logo.png" alt="Bumpy" width={36} height={36} className="rounded-lg" />
        <div>
          <div className="text-base font-bold leading-tight text-gray-900 dark:text-white">Bumpy</div>
          <div className="text-xs text-gray-400">Analytics Pro</div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.heading && (
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.heading}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
