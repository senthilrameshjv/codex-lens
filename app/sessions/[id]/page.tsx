'use client'

import { use } from 'react'
import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import { SessionSidebar } from '@/components/sessions/replay/session-sidebar'
import { AssistantTurnCard, UserTurnCard } from '@/components/sessions/replay/turn-cards'
import { TokenAccumulationChart } from '@/components/sessions/replay/token-accumulation-chart'
import { formatDuration, formatTokens, projectDisplayName } from '@/lib/decode'
import type { ReplayData, SessionMeta } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: replay, error } = useSWR<ReplayData>(`/api/sessions/${id}/replay`, fetcher)
  const { data: metaData } = useSWR<{ session: SessionMeta & { estimated_cost: number } }>(`/api/sessions/${id}`, fetcher)

  if (error) {
    return <div className="p-6 text-sm font-mono text-[#f87171]">Error: {String(error)}</div>
  }

  if (!replay) {
    return <div className="p-6 text-sm font-mono text-muted-foreground">loading replay...</div>
  }

  const meta = metaData?.session
  const totalTokens = replay.turns.reduce((sum, turn) => sum + (turn.usage?.input_tokens ?? 0) + (turn.usage?.output_tokens ?? 0), 0)

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title={`${meta ? projectDisplayName(meta.project_path) : 'session'} · ${replay.thread_name || replay.thread_id || id.slice(0, 8)}`}
        subtitle={`${replay.cli_version || 'unknown version'} · ${formatDuration(meta?.duration_minutes ?? 0)} · ${formatTokens(totalTokens)}`}
      />

      <div className="border-b border-border px-4 py-2.5 flex flex-wrap gap-4 items-center text-sm">
        <span className="text-muted-foreground">turns: <span className="text-foreground font-bold">{replay.turns.length}</span></span>
        <span className="text-muted-foreground">originator: <span className="text-foreground font-bold">{replay.originator || 'unknown'}</span></span>
        <span className="text-muted-foreground">provider: <span className="text-foreground font-bold">{replay.model_provider || 'unknown'}</span></span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 max-w-6xl">
          {replay.turns.map((turn, index) => (
            turn.type === 'user'
              ? <UserTurnCard key={`${turn.uuid}-${index}`} turn={turn} turnNumber={index + 1} toolResults={new Map()} />
              : <AssistantTurnCard key={`${turn.uuid}-${index}`} turn={turn} turnNumber={index + 1} toolResults={new Map()} />
          ))}
        </div>
        <div className="w-64 border-l border-border overflow-y-auto px-4 py-6 flex-shrink-0">
          <SessionSidebar replay={replay} meta={meta} />
        </div>
      </div>

      <div className="border-t border-border px-4 py-4">
        <TokenAccumulationChart turns={replay.turns} compactions={replay.compactions} />
      </div>
    </div>
  )
}
