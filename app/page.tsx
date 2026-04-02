import { TopBar } from '@/components/layout/top-bar'
import { OverviewClient } from './overview-client'

export default function OverviewPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens" subtitle="real-time Codex dashboard" />
      <OverviewClient />
    </div>
  )
}
