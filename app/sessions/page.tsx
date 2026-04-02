'use client'

import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import { SessionTable } from '@/components/sessions/session-table'
import type { SessionWithFacet } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SessionsPage() {
  const { data, error, isLoading } = useSWR<{ sessions: SessionWithFacet[]; total: number }>('/api/sessions', fetcher, { refreshInterval: 5_000 })

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · sessions" subtitle={data ? `${data.total} total sessions` : 'loading...'} />
      <div className="p-6">
        {error && <p className="text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading sessions...</p>}
        {data && <SessionTable sessions={data.sessions} />}
      </div>
    </div>
  )
}
