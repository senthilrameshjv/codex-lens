'use client'

import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import { formatRelativeDate } from '@/lib/decode'
import type { ThreadInfo } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ThreadsPage() {
  const { data, error, isLoading } = useSWR<{ threads: ThreadInfo[] }>('/api/threads', fetcher, { refreshInterval: 10_000 })

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · threads" subtitle={data ? `${data.threads.length} indexed threads` : 'loading...'} />
      <div className="p-6">
        {error && <p className="text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading threads...</p>}
        {data && (
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Thread</th>
                  <th className="px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Id</th>
                  <th className="px-3 py-2 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.threads.map((thread, index) => (
                  <tr key={thread.id} className={index % 2 === 0 ? 'border-b border-border/50' : 'border-b border-border/50 bg-muted/20'}>
                    <td className="px-3 py-2">{thread.thread_name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{thread.id}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatRelativeDate(thread.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
