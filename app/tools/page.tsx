'use client'

import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import { FeatureAdoptionTable } from '@/components/tools/feature-adoption-table'
import { McpServerPanel } from '@/components/tools/mcp-server-panel'
import { ToolRankingChart } from '@/components/tools/tool-ranking-chart'
import { VersionHistoryTable } from '@/components/tools/version-history-table'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/tool-categories'
import type { ToolsAnalytics } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-card p-4">
      <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function ToolsPage() {
  const { data, error, isLoading } = useSWR<ToolsAnalytics>('/api/tools', fetcher, { refreshInterval: 5_000 })

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · tools & workflows" subtitle="tool calls, MCP usage, and workflow adoption" />
      <div className="p-6 space-y-6">
        {error && <p className="text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading tool analytics...</p>}
        {data && (
          <>
            <div className="flex flex-wrap gap-6 py-3 border-b border-border text-[13px]">
              <span className="text-muted-foreground">total tool calls: <span className="text-[#d97706] font-bold text-lg">{data.total_tool_calls.toLocaleString()}</span></span>
              <span className="text-muted-foreground">unique tools: <span className="text-foreground font-bold">{data.tools.length}</span></span>
              <span className="text-muted-foreground">mcp servers: <span className="text-[#34d399] font-bold">{data.mcp_servers.length}</span></span>
            </div>

            <div className="flex flex-wrap gap-3 text-[12px]">
              {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                <span key={category} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}</span>
                </span>
              ))}
            </div>

            <Card title="All Tools">
              <ToolRankingChart tools={data.tools} />
            </Card>

            {data.mcp_servers.length > 0 && (
              <Card title="MCP Servers">
                <McpServerPanel servers={data.mcp_servers} />
              </Card>
            )}

            <Card title="Feature Adoption">
              <FeatureAdoptionTable
                adoption={data.feature_adoption}
                totalSessions={Object.values(data.feature_adoption)[0]
                  ? Math.round(Object.values(data.feature_adoption)[0].sessions / Math.max(0.001, Object.values(data.feature_adoption)[0].pct))
                  : 0}
              />
            </Card>

            <Card title="Codex Version History">
              <VersionHistoryTable versions={data.versions} />
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
