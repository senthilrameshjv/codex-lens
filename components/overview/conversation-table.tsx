'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatRelativeDate, formatTokens, projectDisplayName } from '@/lib/decode'
import type { SessionWithFacet } from '@/types/claude'

type FilterType = 'active' | 'recent' | 'inactive' | 'all'

export function OverviewConversationTable({ sessions }: { sessions: SessionWithFacet[] }) {
  const [filter, setFilter] = useState<FilterType>('recent')

  const filtered = useMemo(() => {
    const now = sessions.length > 0
      ? new Date(sessions[0].start_time).getTime()
      : 0
    const oneDay = 24 * 60 * 60 * 1000
    const oneWeek = 7 * oneDay
    const result = sessions.filter((session) => {
      const age = now - new Date(session.start_time).getTime()
      if (filter === 'active') return age < oneDay
      if (filter === 'recent') return age < oneWeek
      if (filter === 'inactive') return age >= oneWeek
      return true
    })
    return result.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 10)
  }, [filter, sessions])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['active', 'recent', 'inactive', 'all'] as FilterType[]).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={[
              'px-3 py-1.5 text-[13px] font-mono rounded border transition-colors',
              filter === value
                ? 'bg-primary text-primary-foreground border-primary font-bold'
                : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground',
            ].join(' ')}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">session</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">thread</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">workspace</th>
                <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wider text-muted-foreground">messages</th>
                <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wider text-muted-foreground">tokens</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">last activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session, index) => {
                const totalMessages = session.user_message_count + session.assistant_message_count
                const totalTokens = session.input_tokens + session.output_tokens
                return (
                  <tr key={session.session_id} className={index % 2 === 0 ? 'border-b border-border/60' : 'border-b border-border/60 bg-muted/30'}>
                    <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                      <Link href={`/sessions/${session.session_id}`} className="hover:text-primary transition-colors">
                        {session.session_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-3 py-2">{session.thread_name || session.thread_id || '-'}</td>
                    <td className="px-3 py-2">{projectDisplayName(session.project_path || '')}</td>
                    <td className="px-3 py-2 text-right">{totalMessages.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-primary">{formatTokens(totalTokens)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatRelativeDate(session.start_time)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
