'use client'

import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import type { MemoryEntry } from '@/lib/claude-reader'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MemoryPage() {
  const { data, error, isLoading } = useSWR<{ memories: MemoryEntry[] }>('/api/memory', fetcher, { refreshInterval: 15_000 })

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · memory" subtitle="~/.codex/memories/" />
      <div className="p-4 md:p-6 space-y-4">
        {error && <p className="text-[#f87171] text-sm font-mono">Error loading memories.</p>}
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading memories...</p>}
        {data && data.memories.length === 0 && <p className="text-sm font-mono text-muted-foreground">No memory files found in `~/.codex/memories/`.</p>}
        {data && data.memories.map((entry) => (
          <div key={`${entry.projectPath}-${entry.file}`} className="border border-border rounded bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-mono font-bold text-foreground">{entry.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{entry.file}</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{new Date(entry.mtime).toLocaleString()}</span>
            </div>
            <pre className="mt-3 text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/30 rounded p-3 overflow-x-auto">
              {entry.body}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
