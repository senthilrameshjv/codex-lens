'use client'

import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import type { PluginInfo, PromptInfo, SkillInfo } from '@/lib/claude-reader'
import type { ThreadInfo } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-card p-4">
      <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { data, error, isLoading } = useSWR<{
    settings: Record<string, unknown>
    storageBytes: number
    skills: SkillInfo[]
    plugins: PluginInfo[]
    prompts: PromptInfo[]
    threads: ThreadInfo[]
  }>('/api/settings', fetcher, { refreshInterval: 30_000 })

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · settings" subtitle="~/.codex/config.toml and local inventory" />
      <div className="p-4 md:p-6 space-y-6">
        {error && <p className="text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading settings...</p>}
        {data && (
          <>
            <Section title="Runbook">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-mono">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">model</span><span>{String(data.settings.model ?? 'unknown')}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">reasoning</span><span>{String(data.settings.model_reasoning_effort ?? '-')}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">context window</span><span>{String(data.settings.model_context_window ?? '-')}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">storage</span><span>{data.storageBytes.toLocaleString()} bytes</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">skills</span><span>{data.skills.length}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">prompts</span><span>{data.prompts.length}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">plugins</span><span>{data.plugins.length}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">threads indexed</span><span>{data.threads.length}</span></div>
              </div>
            </Section>

            <Section title="Skills">
              <div className="grid gap-2">
                {data.skills.slice(0, 20).map((skill) => (
                  <div key={skill.name} className="border border-border rounded p-3">
                    <p className="text-primary font-mono text-sm font-bold">{skill.name}</p>
                    {skill.description && <p className="text-foreground text-xs mt-0.5">{skill.description}</p>}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Prompts">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.prompts.map((prompt) => (
                  <div key={prompt.name} className="border border-border rounded p-3 text-sm font-mono">
                    {prompt.name}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Plugins">
              <div className="grid gap-2">
                {data.plugins.length === 0 && <p className="text-sm font-mono text-muted-foreground">No plugins discovered in `.codex/plugins`.</p>}
                {data.plugins.map((plugin, index) => (
                  <div key={`${plugin.id}-${index}`} className="border border-border rounded p-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-primary font-mono text-sm font-bold">{plugin.id}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">scope: {plugin.scope}</p>
                    </div>
                    <span className="text-muted-foreground text-xs font-mono">{plugin.version}</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
