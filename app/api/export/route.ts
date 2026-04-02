import { NextResponse } from 'next/server'
import { readStatsCache, getSessions, readAllFacets, readHistory } from '@/lib/claude-reader'
import type { ExportPayload } from '@/types/claude'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { dateRange } = body as { dateRange?: { from?: string; to?: string } }

  const [stats, sessions, facets, history] = await Promise.all([
    readStatsCache(),
    getSessions(),
    readAllFacets(),
    readHistory(10_000),
  ])

  // Filter by date range if provided
  const filteredSessions = sessions.filter(s => {
    if (dateRange?.from && s.start_time < dateRange.from) return false
    if (dateRange?.to && s.start_time > dateRange.to + 'Z') return false
    return true
  })

  const sessionIds = new Set(filteredSessions.map(s => s.session_id))
  const filteredFacets = facets.filter(f => sessionIds.has(f.session_id))

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    stats: stats!,
    sessions: filteredSessions,
    facets: filteredFacets,
    history,
  }

  return NextResponse.json(payload)
}
