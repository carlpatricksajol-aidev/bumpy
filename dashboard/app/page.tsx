'use client'
import { useState } from 'react'
import { AppProviders } from '@/components/providers'
import AuthWrapper from '@/components/auth/AuthWrapper'
import { EntityDetailProvider } from '@/components/detail/EntityDetail'
import Sidebar, { type Section } from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import OverviewPage from '@/components/overview/OverviewPage'
import AlertsPage from '@/components/alerts/AlertsPage'
import PerformancePage from '@/components/performance/PerformancePage'
import CreativeExplorer from '@/components/explorer/CreativeExplorer'
import PersonaReport from '@/components/persona/PersonaReport'
import SettingsPage from '@/components/settings/SettingsPage'
import type { GroupLevel } from '@/lib/types'

const META: Record<Section, { title: string; subtitle?: string }> = {
  overview: { title: 'Overview', subtitle: 'Account health, yesterday’s winners and trends' },
  alerts: { title: 'Smart Alerts', subtitle: 'Actionable performance signals' },
  campaigns: { title: 'Campaigns', subtitle: 'Campaign → ad set → creative hierarchy' },
  adsets: { title: 'Ad Sets', subtitle: 'Ad set performance' },
  creatives: { title: 'Creatives', subtitle: 'Individual ad performance' },
  concept: { title: 'By Concept', subtitle: 'Aggregated by creative concept' },
  persona: { title: 'By Persona', subtitle: 'Aggregated by persona' },
  explorer: { title: 'Creative Explorer', subtitle: 'Quadrant analysis across creatives' },
  personaReport: { title: 'Persona Report', subtitle: 'Weekly persona performance' },
  settings: { title: 'Settings' },
}

const GROUP: Partial<Record<Section, GroupLevel>> = {
  campaigns: 'campaign',
  adsets: 'adset',
  creatives: 'creative',
  concept: 'concept',
  persona: 'persona',
}

export default function Home() {
  const [section, setSection] = useState<Section>('overview')

  const render = () => {
    switch (section) {
      case 'overview': return <OverviewPage />
      case 'alerts': return <AlertsPage />
      case 'explorer': return <CreativeExplorer />
      case 'personaReport': return <PersonaReport />
      case 'settings': return <SettingsPage />
      default: return <PerformancePage group={GROUP[section]!} />
    }
  }

  return (
    <AppProviders>
      <AuthWrapper>
        <EntityDetailProvider>
          <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
            <Sidebar active={section} onSelect={setSection} />
            <main className="ml-56 px-8 pb-12">
              <TopBar title={META[section].title} subtitle={META[section].subtitle} />
              {render()}
            </main>
          </div>
        </EntityDetailProvider>
      </AuthWrapper>
    </AppProviders>
  )
}
