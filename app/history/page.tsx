'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import type { HistoryEntry } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())
const PAGE_SIZE = 50

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const { data, error, isLoading } = useSWR<{ history: HistoryEntry[] }>('/api/history?limit=2000', fetcher, { refreshInterval: 30_000 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const entries = useMemo(() => {
    const items = [...(data?.history ?? [])].reverse()
    if (!search) return items
    const query = search.toLowerCase()
    return items.filter((entry) => entry.display.toLowerCase().includes(query) || entry.project.toLowerCase().includes(query))
  }, [data, search])

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · history" subtitle="~/.codex/history.jsonl" />
      <div className="p-4 md:p-6 space-y-4">
        {error && <p className="text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading history...</p>}
        {data && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 border border-border rounded bg-card w-full">
                <input
                  className="w-full bg-transparent px-4 py-2.5 text-sm font-mono text-foreground placeholder-muted-foreground/50 outline-none"
                  placeholder="search prompts..."
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                />
              </div>
              <p className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                <span className="text-[#fbbf24] font-bold">{entries.length}</span> entries
              </p>
            </div>

            {pageEntries.length === 0 ? (
              <p className="text-muted-foreground/60 text-sm font-mono text-center py-12">
                {(data.history?.length ?? 0) === 0 ? 'No history found in ~/.codex/history.jsonl' : 'No entries match your search.'}
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  {pageEntries.map((entry, index) => (
                    <div key={index} className="border border-border rounded bg-card px-4 py-3 hover:border-primary/30 transition-colors">
                      <p className="text-sm font-mono text-foreground leading-relaxed break-words">{entry.display || '-'}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="text-xs font-mono text-muted-foreground/60">{formatTime(entry.timestamp)}</span>
                        {entry.project && <span className="text-xs font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">{entry.project}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm font-mono border border-border rounded disabled:opacity-30">prev</button>
                  <span className="text-sm font-mono text-muted-foreground/60">{page} / {totalPages}</span>
                  <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-mono border border-border rounded disabled:opacity-30">next</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
