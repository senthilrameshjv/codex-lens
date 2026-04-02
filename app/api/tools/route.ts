import { NextResponse } from 'next/server'
import { getSessions } from '@/lib/claude-reader'
import { categorizeTool, isMcpTool, parseMcpTool } from '@/lib/tool-categories'
import type { McpServerSummary, ToolSummary, ToolsAnalytics, VersionRecord } from '@/types/claude'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sessions = await getSessions()
  const totalSessions = sessions.length
  const toolTotals = new Map<string, number>()
  const toolSessionCount = new Map<string, Set<string>>()
  const mcpServerCalls = new Map<string, Map<string, number>>()
  const mcpServerSessions = new Map<string, Set<string>>()

  for (const session of sessions) {
    for (const [tool, count] of Object.entries(session.tool_counts)) {
      toolTotals.set(tool, (toolTotals.get(tool) ?? 0) + count)
      if (!toolSessionCount.has(tool)) toolSessionCount.set(tool, new Set())
      toolSessionCount.get(tool)!.add(session.session_id)

      if (isMcpTool(tool)) {
        const parsed = parseMcpTool(tool)
        if (parsed) {
          if (!mcpServerCalls.has(parsed.server)) mcpServerCalls.set(parsed.server, new Map())
          if (!mcpServerSessions.has(parsed.server)) mcpServerSessions.set(parsed.server, new Set())
          const serverMap = mcpServerCalls.get(parsed.server)!
          serverMap.set(parsed.tool, (serverMap.get(parsed.tool) ?? 0) + count)
          mcpServerSessions.get(parsed.server)!.add(session.session_id)
        }
      }
    }
  }

  const tools: ToolSummary[] = [...toolTotals.entries()]
    .map(([name, total_calls]) => ({
      name,
      category: categorizeTool(name),
      total_calls,
      session_count: toolSessionCount.get(name)?.size ?? 0,
      error_count: 0,
    }))
    .sort((a, b) => b.total_calls - a.total_calls)

  const mcp_servers: McpServerSummary[] = [...mcpServerCalls.entries()]
    .map(([server_name, toolMap]) => {
      const tools = [...toolMap.entries()].map(([name, calls]) => ({ name, calls })).sort((a, b) => b.calls - a.calls)
      return {
        server_name,
        tools,
        total_calls: tools.reduce((sum, item) => sum + item.calls, 0),
        session_count: mcpServerSessions.get(server_name)?.size ?? 0,
      }
    })
    .sort((a, b) => b.total_calls - a.total_calls)

  const versionsMap = new Map<string, { sessions: Set<string>; first_seen: string; last_seen: string }>()
  const branchesMap = new Map<string, number>()
  for (const session of sessions) {
    const version = session.cli_version || 'unknown'
    const record = versionsMap.get(version) ?? { sessions: new Set(), first_seen: session.start_time, last_seen: session.start_time }
    record.sessions.add(session.session_id)
    record.first_seen = record.first_seen < session.start_time ? record.first_seen : session.start_time
    record.last_seen = record.last_seen > session.start_time ? record.last_seen : session.start_time
    versionsMap.set(version, record)
    const branch = basename(session.project_path)
    branchesMap.set(branch, (branchesMap.get(branch) ?? 0) + 1)
  }

  const versions: VersionRecord[] = [...versionsMap.entries()]
    .map(([version, record]) => ({
      version,
      session_count: record.sessions.size,
      first_seen: record.first_seen,
      last_seen: record.last_seen,
    }))
    .sort((a, b) => b.last_seen.localeCompare(a.last_seen))

  const feature_adoption = {
    task_agents: feature(sessions.filter((session) => session.uses_task_agent).length, totalSessions),
    mcp: feature(sessions.filter((session) => session.uses_mcp).length, totalSessions),
    web: feature(sessions.filter((session) => session.uses_web_search || session.uses_web_fetch).length, totalSessions),
    plan_mode: feature(sessions.filter((session) => (session.plan_mode_turns ?? 0) > 0).length, totalSessions),
    commentary: feature(sessions.filter((session) => (session.commentary_message_count ?? 0) > 0).length, totalSessions),
    aborted: feature(sessions.filter((session) => (session.aborted_turns ?? 0) > 0).length, totalSessions),
  }

  const result: ToolsAnalytics = {
    tools,
    mcp_servers,
    feature_adoption,
    versions,
    branches: [...branchesMap.entries()].map(([branch, turns]) => ({ branch, turns })).sort((a, b) => b.turns - a.turns).slice(0, 15),
    error_categories: {},
    total_tool_calls: tools.reduce((sum, tool) => sum + tool.total_calls, 0),
    total_errors: 0,
  }

  return NextResponse.json(result)
}

function feature(count: number, total: number) {
  return { sessions: count, pct: total > 0 ? count / total : 0 }
}

function basename(value: string) {
  const parts = value.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || value
}
