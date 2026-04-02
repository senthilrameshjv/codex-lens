import { NextResponse } from 'next/server'
import { getSessions } from '@/lib/claude-reader'
import { projectDisplayName } from '@/lib/decode'
import type { ProjectSummary } from '@/types/claude'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sessions = await getSessions()
  const byPath = new Map<string, typeof sessions>()
  for (const session of sessions) {
    const projectPath = session.project_path || 'unknown'
    if (!byPath.has(projectPath)) byPath.set(projectPath, [])
    byPath.get(projectPath)!.push(session)
  }

  const projects: ProjectSummary[] = [...byPath.entries()].map(([project_path, items]) => ({
    slug: encodeURIComponent(project_path),
    project_path,
    display_name: projectDisplayName(project_path),
    session_count: items.length,
    total_messages: items.reduce((sum, item) => sum + item.user_message_count + item.assistant_message_count, 0),
    total_duration_minutes: items.reduce((sum, item) => sum + item.duration_minutes, 0),
    total_lines_added: 0,
    total_lines_removed: 0,
    total_files_modified: 0,
    git_commits: 0,
    git_pushes: 0,
    estimated_cost: 0,
    input_tokens: items.reduce((sum, item) => sum + item.input_tokens, 0),
    output_tokens: items.reduce((sum, item) => sum + item.output_tokens, 0),
    languages: {},
    tool_counts: aggregateTools(items),
    last_active: items.map((item) => item.start_time).sort().at(-1) ?? '',
    first_active: items.map((item) => item.start_time).sort()[0] ?? '',
    uses_mcp: items.some((item) => item.uses_mcp),
    uses_task_agent: items.some((item) => item.uses_task_agent),
    branches: [],
  }))

  return NextResponse.json({ projects: projects.sort((a, b) => b.last_active.localeCompare(a.last_active)) })
}

function aggregateTools(items: Awaited<ReturnType<typeof getSessions>>) {
  const counts: Record<string, number> = {}
  for (const session of items) {
    for (const [tool, count] of Object.entries(session.tool_counts)) {
      counts[tool] = (counts[tool] ?? 0) + count
    }
  }
  return counts
}
