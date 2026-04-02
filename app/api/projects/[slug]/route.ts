import { NextResponse } from 'next/server'
import { getSessions } from '@/lib/claude-reader'
import { projectDisplayName } from '@/lib/decode'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const projectPath = decodeURIComponent(slug)
  const sessions = (await getSessions()).filter((session) => session.project_path === projectPath)
  return NextResponse.json({
    project_path: projectPath,
    display_name: projectDisplayName(projectPath),
    sessions: sessions.map((session) => ({ ...session, estimated_cost: 0, slug: session.thread_id, version: session.cli_version })),
    tool_counts: sessions.reduce<Record<string, number>>((counts, session) => {
      for (const [tool, count] of Object.entries(session.tool_counts)) counts[tool] = (counts[tool] ?? 0) + count
      return counts
    }, {}),
    cost_by_session: sessions.map((session) => ({ session_id: session.session_id, start_time: session.start_time, cost: 0, messages: session.user_message_count + session.assistant_message_count })),
    branches: [],
  })
}
