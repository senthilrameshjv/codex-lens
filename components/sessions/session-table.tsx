'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SessionBadges } from './session-badges'
import { formatDate, formatDuration, formatTokens, projectDisplayName } from '@/lib/decode'
import type { SessionWithFacet } from '@/types/claude'

const PAGE_SIZE = 25

export function SessionTable({ sessions }: { sessions: SessionWithFacet[] }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterAgent, setFilterAgent] = useState(false)
  const [filterMcp, setFilterMcp] = useState(false)

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (filterAgent && !session.uses_task_agent) return false
      if (filterMcp && !session.uses_mcp) return false
      if (!search) return true
      const query = search.toLowerCase()
      return (
        session.project_path.toLowerCase().includes(query) ||
        (session.thread_name || '').toLowerCase().includes(query) ||
        session.first_prompt.toLowerCase().includes(query)
      )
    })
  }, [filterAgent, filterMcp, search, sessions])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search thread, workspace, or prompt..."
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1) }}
          className="bg-muted border border-border rounded px-2 py-1 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 w-64"
        />
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={filterAgent} onChange={(event) => setFilterAgent(event.target.checked)} />
          agent
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={filterMcp} onChange={(event) => setFilterMcp(event.target.checked)} />
          mcp
        </label>
        <span className="ml-auto text-[13px] text-muted-foreground">{filtered.length} sessions</span>
      </div>

      <div className="border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Thread</th>
                <th className="px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Workspace</th>
                <th className="px-3 py-2 text-right text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Duration</th>
                <th className="px-3 py-2 text-right text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Tokens</th>
                <th className="px-3 py-2 text-right text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Tools</th>
                <th className="px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Flags</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((session, index) => (
                <tr key={session.session_id} className={index % 2 === 0 ? 'border-b border-border/50' : 'border-b border-border/50 bg-muted/20'}>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{formatDate(session.start_time)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/sessions/${session.session_id}`} className="text-foreground hover:text-primary transition-colors">
                      {session.thread_name || session.thread_id || session.session_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{projectDisplayName(session.project_path)}</td>
                  <td className="px-3 py-2 text-right">{formatDuration(session.duration_minutes)}</td>
                  <td className="px-3 py-2 text-right font-mono text-primary">{formatTokens(session.input_tokens + session.output_tokens)}</td>
                  <td className="px-3 py-2 text-right">{Object.values(session.tool_counts).reduce((sum, count) => sum + count, 0)}</td>
                  <td className="px-3 py-2">
                    <SessionBadges
                      has_compaction={false}
                      uses_task_agent={session.uses_task_agent}
                      uses_mcp={session.uses_mcp}
                      uses_web_search={session.uses_web_search}
                      uses_web_fetch={session.uses_web_fetch}
                      has_thinking={session.has_thinking}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="px-2 py-1 rounded border border-border disabled:opacity-30">prev</button>
          <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="px-2 py-1 rounded border border-border disabled:opacity-30">next</button>
        </div>
      </div>
    </div>
  )
}
