'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import { ProjectCard } from '@/components/projects/project-card'
import type { ProjectSummary } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type SortKey = 'last_active' | 'session_count' | 'total_duration_minutes'

export default function ProjectsPage() {
  const { data, error, isLoading } = useSWR<{ projects: ProjectSummary[] }>('/api/projects', fetcher, { refreshInterval: 5_000 })
  const [sort, setSort] = useState<SortKey>('last_active')
  const [search, setSearch] = useState('')

  const projects = useMemo(() => {
    const items = [...(data?.projects ?? [])].filter((project) => {
      const query = search.toLowerCase()
      return !query || project.display_name.toLowerCase().includes(query) || project.project_path.toLowerCase().includes(query)
    })
    return items.sort((a, b) => {
      if (sort === 'last_active') return b.last_active.localeCompare(a.last_active)
      return (b[sort] as number) - (a[sort] as number)
    })
  }, [data, search, sort])

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · projects" subtitle={data ? `${data.projects.length} workspaces` : 'loading...'} />
      <div className="p-6 space-y-4">
        {error && <p className="text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-muted border border-border rounded px-2 py-1 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 w-56"
          />
          <div className="flex gap-1 ml-auto">
            {[
              ['last_active', 'Recent'],
              ['session_count', 'Sessions'],
              ['total_duration_minutes', 'Time'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSort(value as SortKey)}
                className={`px-2 py-1 rounded text-[12px] transition-colors ${sort === value ? 'bg-primary text-black font-bold' : 'text-muted-foreground hover:text-foreground border border-border'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading workspaces...</p>}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => <ProjectCard key={project.slug} project={project} />)}
          </div>
        )}
        {!isLoading && projects.length === 0 && (
          <p className="text-muted-foreground/50 text-sm text-center py-12">
            {search ? 'No projects match your search.' : 'No workspaces found in ~/.codex/'}
          </p>
        )}
      </div>
    </div>
  )
}
