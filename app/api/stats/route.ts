import { NextResponse } from 'next/server'
import { getSessions, getCodexStorageBytes, readStatsCache, readSettings } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [stats, sessions, storageBytes, settings] = await Promise.all([
    readStatsCache(),
    getSessions(),
    getCodexStorageBytes(),
    readSettings(),
  ])

  if (!stats) {
    return NextResponse.json({ error: 'No Codex stats available' }, { status: 404 })
  }

  let totalToolCalls = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCacheReadTokens = 0
  let totalCacheWriteTokens = 0
  let workflowSessions = 0

  for (const session of sessions) {
    totalToolCalls += Object.values(session.tool_counts).reduce((sum, count) => sum + count, 0)
    totalInputTokens += session.input_tokens ?? 0
    totalOutputTokens += session.output_tokens ?? 0
    totalCacheReadTokens += session.cache_read_input_tokens ?? 0
    totalCacheWriteTokens += session.cache_creation_input_tokens ?? 0
    if ((session.plan_mode_turns ?? 0) > 0 || session.uses_task_agent || session.uses_mcp) {
      workflowSessions++
    }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  return NextResponse.json({
    stats,
    computed: {
      totalCost: 0,
      totalCacheSavings: 0,
      totalTokens: totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheWriteTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalCacheWriteTokens,
      totalToolCalls,
      activeDays: stats.dailyActivity.filter((item) => item.sessionCount > 0).length,
      avgSessionMinutes: sessions.length > 0
        ? sessions.reduce((sum, session) => sum + session.duration_minutes, 0) / sessions.length
        : 0,
      sessionsThisMonth: sessions.filter((session) => new Date(session.start_time) >= monthStart).length,
      sessionsThisWeek: sessions.filter((session) => new Date(session.start_time) >= weekStart).length,
      storageBytes,
      sessionCount: sessions.length,
      workflowSessions,
      threadCount: new Set(sessions.map((session) => session.thread_id)).size,
      model: settings.model ?? 'unknown',
      modelContextWindow: settings.model_context_window ?? '',
    },
  })
}
