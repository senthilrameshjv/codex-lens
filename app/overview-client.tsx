'use client'

import useSWR from 'swr'
import { UsageOverTimeChart } from '@/components/overview/usage-over-time-chart'
import { ModelBreakdownDonut } from '@/components/overview/model-breakdown-donut'
import { ProjectActivityDonut } from '@/components/overview/project-activity-donut'
import { PeakHoursChart } from '@/components/overview/peak-hours-chart'
import { OverviewConversationTable } from '@/components/overview/conversation-table'
import { formatBytes, formatTokens } from '@/lib/decode'
import type { ProjectSummary, SessionWithFacet, StatsCache, ThreadInfo } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ApiResponse {
  stats: StatsCache
  computed: {
    totalTokens: number
    totalToolCalls: number
    sessionsThisMonth: number
    sessionsThisWeek: number
    storageBytes: number
    sessionCount: number
    workflowSessions: number
    threadCount: number
    model: string
    modelContextWindow: string
  }
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-4 min-w-40">
      <p className="text-[12px] uppercase tracking-widest text-muted-foreground font-mono">{label}</p>
      <p className="text-2xl font-bold font-mono text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground font-mono mt-1">{sub}</p>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg bg-card p-5">
      <h2 className="text-[13px] font-bold tracking-[0.18em] mb-4 font-mono text-muted-foreground uppercase">{title}</h2>
      {children}
    </div>
  )
}

export function OverviewClient() {
  const { data, error, isLoading } = useSWR<ApiResponse>('/api/stats', fetcher, { refreshInterval: 5_000 })
  const { data: sessionsData } = useSWR<{ sessions: SessionWithFacet[] }>('/api/sessions', fetcher, { refreshInterval: 5_000 })
  const { data: projectsData } = useSWR<{ projects: ProjectSummary[] }>('/api/projects', fetcher, { refreshInterval: 5_000 })
  const { data: threadsData } = useSWR<{ threads: ThreadInfo[] }>('/api/threads', fetcher, { refreshInterval: 10_000 })

  if (error) {
    return <div className="px-8 py-6 text-destructive text-sm font-mono">error loading data: {String(error)}</div>
  }

  if (isLoading || !data) {
    return <div className="px-8 py-6 text-sm font-mono text-muted-foreground">loading dashboard...</div>
  }

  const sessions = sessionsData?.sessions ?? []
  const projects = projectsData?.projects ?? []
  const threads = threadsData?.threads ?? []

  return (
    <div className="px-8 py-6 space-y-8 bg-background">
      <div className="flex flex-wrap gap-4">
        <Stat label="sessions" value={String(data.computed.sessionCount)} sub={`month ${data.computed.sessionsThisMonth} / week ${data.computed.sessionsThisWeek}`} />
        <Stat label="threads" value={String(data.computed.threadCount)} />
        <Stat label="tokens" value={formatTokens(data.computed.totalTokens)} />
        <Stat label="tool calls" value={String(data.computed.totalToolCalls)} />
        <Stat label="workflow usage" value={String(data.computed.workflowSessions)} />
        <Stat label="storage" value={formatBytes(data.computed.storageBytes)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <Card title="Usage Over Time">
          <UsageOverTimeChart data={data.stats.dailyActivity} days={90} />
        </Card>
        <Card title="Workspace Activity">
          <ProjectActivityDonut projects={projects} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Model Distribution">
          <ModelBreakdownDonut modelUsage={data.stats.modelUsage} />
        </Card>
        <Card title="Peak Hours">
          <PeakHoursChart hourCounts={data.stats.hourCounts} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <Card title="Recent Sessions">
          <OverviewConversationTable sessions={sessions} />
        </Card>
        <Card title="Environment">
          <div className="space-y-3 text-sm font-mono">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">model</span><span>{String(data.computed.model || 'unknown')}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">context window</span><span>{String(data.computed.modelContextWindow || '-')}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">projects</span><span>{projects.length}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">threads</span><span>{threads.length}</span></div>
            <div className="border-t border-border pt-3">
              <p className="text-muted-foreground mb-2">recent thread names</p>
              <div className="space-y-1">
                {threads.slice(0, 5).map((thread) => (
                  <div key={thread.id} className="truncate">{thread.thread_name}</div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
