import { NextResponse } from 'next/server'
import { getSessions } from '@/lib/claude-reader'
import type { SessionWithFacet } from '@/types/claude'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sessions = await getSessions()
  const result: SessionWithFacet[] = sessions.map((session) => ({
    ...session,
    estimated_cost: 0,
    slug: session.thread_id,
    version: session.cli_version,
    git_branch: undefined,
  }))
  return NextResponse.json({ sessions: result, total: result.length })
}
