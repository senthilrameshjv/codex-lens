import { NextResponse } from 'next/server'
import { getSessions, readStatsCache } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [stats, sessions] = await Promise.all([readStatsCache(), getSessions()])
  return NextResponse.json({
    total_cost: 0,
    total_savings: 0,
    models: Object.entries(stats?.modelUsage ?? {}).map(([model, usage]) => ({
      model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_write_tokens: usage.cacheCreationInputTokens,
      cache_read_tokens: usage.cacheReadInputTokens,
      estimated_cost: 0,
      cache_savings: 0,
      cache_hit_rate: 0,
    })),
    daily: (stats?.tokensByDate ?? []).map((item) => ({ date: item.date, costs: {}, total: 0 })),
    by_project: [...new Set(sessions.map((session) => session.project_path))].map((project_path) => ({
      slug: project_path,
      display_name: project_path,
      estimated_cost: 0,
      input_tokens: 0,
      output_tokens: 0,
    })),
  })
}
