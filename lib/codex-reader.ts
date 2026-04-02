import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type {
  DailyActivity,
  DailyTokens,
  Facet,
  HistoryEntry,
  ModelUsage,
  ReplayData,
  ReplayTurn,
  SessionMeta,
  StatsCache,
  SummaryEvent,
  ThreadInfo,
  TurnUsage,
} from '@/types/codex'

type JsonMap = Record<string, unknown>

const CODEX_DIR = process.env.CODEX_LENS_DATA_DIR || path.join(os.homedir(), '.codex')

export interface SkillInfo {
  name: string
  description: string
  triggers: string
  hasSkillMd: boolean
}

export interface PluginInfo {
  id: string
  scope: string
  version: string
  installedAt: string
}

export interface PromptInfo {
  name: string
  path: string
}

export interface MemoryEntry {
  file: string
  projectSlug: string
  projectPath: string
  name: string
  type: 'memory' | 'unknown'
  description: string
  body: string
  mtime: string
  isIndex: boolean
}

export type MemoryType = MemoryEntry['type']

export interface PlanFile {
  path: string
  name: string
  content: string
  mtime: string
}

export interface TodoFile {
  path: string
  name: string
  data: unknown
  mtime: string
}

function emptyStats(): StatsCache {
  return {
    version: 1,
    lastComputedDate: new Date().toISOString(),
    dailyActivity: [],
    tokensByDate: [],
    modelUsage: {},
    totalSessions: 0,
    totalMessages: 0,
    longestSession: { sessionId: '', duration: 0, messageCount: 0, timestamp: '' },
    firstSessionDate: '',
    hourCounts: {},
    totalSpeculationTimeSavedMs: 0,
  }
}

function safeJsonParse(raw: string): JsonMap | null {
  try {
    return JSON.parse(raw) as JsonMap
  } catch {
    return null
  }
}

function basenameFromPath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/\/$/, '')
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] || value
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (!item || typeof item !== 'object') return ''
      const map = item as JsonMap
      if (typeof map.text === 'string') return map.text
      if (typeof map.message === 'string') return map.message
      if (typeof map.content === 'string') return map.content
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function usageFromTokenCount(value: JsonMap | undefined): TurnUsage | undefined {
  if (!value) return undefined
  return {
    input_tokens: Number(value.input_tokens ?? 0),
    output_tokens: Number(value.output_tokens ?? 0),
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: Number(value.cached_input_tokens ?? 0),
    cached_input_tokens: Number(value.cached_input_tokens ?? 0),
    reasoning_output_tokens: Number(value.reasoning_output_tokens ?? 0),
    total_tokens: Number(value.total_tokens ?? 0),
    model_context_window: Number(value.model_context_window ?? 0) || undefined,
  }
}

export function codexPath(...segments: string[]): string {
  return path.join(CODEX_DIR, ...segments)
}

export async function readJSONLLines(
  filePath: string,
  cb: (line: JsonMap) => void,
): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue
      const parsed = safeJsonParse(line)
      if (parsed) cb(parsed)
    }
  } catch {
    // ignore
  }
}

async function listFilesRecursive(dirPath: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        files.push(...await listFilesRecursive(fullPath))
      } else {
        files.push(fullPath)
      }
    }
  } catch {
    // ignore
  }
  return files
}

export async function listSessionFiles(): Promise<string[]> {
  const files = await listFilesRecursive(codexPath('sessions'))
  return files.filter((filePath) => filePath.endsWith('.jsonl')).sort((a, b) => a.localeCompare(b))
}

export async function readSessionIndex(): Promise<ThreadInfo[]> {
  const items: ThreadInfo[] = []
  await readJSONLLines(codexPath('session_index.jsonl'), (line) => {
    const id = typeof line.id === 'string' ? line.id : ''
    if (!id) return
    items.push({
      id,
      thread_name: typeof line.thread_name === 'string' ? line.thread_name : id,
      updated_at: typeof line.updated_at === 'string' ? line.updated_at : '',
    })
  })
  const deduped = new Map<string, ThreadInfo>()
  for (const item of items) deduped.set(item.id, item)
  return [...deduped.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export async function readHistory(limit = 200): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = []
  await readJSONLLines(codexPath('history.jsonl'), (line) => {
    const text = typeof line.text === 'string' ? line.text : ''
    if (!text) return
    const tsSeconds = Number(line.ts ?? 0)
    const sessionId = typeof line.session_id === 'string' ? line.session_id : undefined
    entries.push({
      display: text,
      timestamp: tsSeconds > 0 ? tsSeconds * 1000 : Date.now(),
      project: sessionId ?? '',
      sessionId,
    })
  })
  return entries.slice(-limit)
}

export async function readSessionSummary(filePath: string, threadMap?: Map<string, ThreadInfo>): Promise<SessionMeta | null> {
  let sessionId = path.basename(filePath, '.jsonl')
  let threadId = ''
  let projectPath = ''
  let startTime = ''
  let updatedAt = ''
  let userCount = 0
  let assistantCount = 0
  let developerCount = 0
  let systemCount = 0
  let agentMessageCount = 0
  let commentaryCount = 0
  let finalCount = 0
  let functionCallCount = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheRead = 0
  let firstPrompt = ''
  let originator = ''
  let source = ''
  let cliVersion = ''
  let modelProvider = ''
  let hasThinking = false
  let usesTaskAgent = false
  let usesMcp = false
  let usesWeb = false
  let abortedTurns = 0
  let planModeTurns = 0
  const toolCounts: Record<string, number> = {}
  const userMessageTimestamps: string[] = []
  const messageHours: number[] = []

  await readJSONLLines(filePath, (line) => {
    const timestamp = typeof line.timestamp === 'string' ? line.timestamp : ''
    if (timestamp) {
      if (!startTime) startTime = timestamp
      updatedAt = timestamp
    }

    if (line.type === 'session_meta' && line.payload && typeof line.payload === 'object') {
      const payload = line.payload as JsonMap
      sessionId = typeof payload.id === 'string' ? payload.id : sessionId
      threadId = typeof payload.id === 'string' ? payload.id : threadId
      projectPath = typeof payload.cwd === 'string' ? payload.cwd : projectPath
      originator = typeof payload.originator === 'string' ? payload.originator : originator
      source = typeof payload.source === 'string' ? payload.source : source
      cliVersion = typeof payload.cli_version === 'string' ? payload.cli_version : cliVersion
      modelProvider = typeof payload.model_provider === 'string' ? payload.model_provider : modelProvider
      if (typeof payload.timestamp === 'string') startTime = payload.timestamp
      return
    }

    if (line.type === 'response_item' && line.payload && typeof line.payload === 'object') {
      const payload = line.payload as JsonMap
      const payloadType = typeof payload.type === 'string' ? payload.type : ''
      if (payloadType === 'message') {
        const role = typeof payload.role === 'string' ? payload.role : 'assistant'
        const text = extractText(Array.isArray(payload.content) ? payload.content : [])
        if (role === 'user') {
          userCount++
          if (!firstPrompt && text) firstPrompt = text.slice(0, 500)
          if (timestamp) {
            userMessageTimestamps.push(timestamp)
            messageHours.push(new Date(timestamp).getHours())
          }
        } else if (role === 'assistant') {
          assistantCount++
        } else if (role === 'developer') {
          developerCount++
        } else {
          systemCount++
        }
      } else if (payloadType === 'function_call') {
        functionCallCount++
        const name = typeof payload.name === 'string' ? payload.name : 'unknown'
        toolCounts[name] = (toolCounts[name] ?? 0) + 1
        usesMcp ||= name.includes('mcp__')
        usesWeb ||= name.includes('web')
        usesTaskAgent ||= ['spawn_agent', 'send_input', 'wait_agent', 'resume_agent', 'close_agent'].includes(name)
        planModeTurns ||= name === 'update_plan' ? 1 : 0
      } else if (payloadType === 'reasoning') {
        hasThinking = true
      } else if (payloadType === 'function_call_output') {
        const output = typeof payload.output === 'string' ? payload.output : ''
        if (/aborted by user/i.test(output)) abortedTurns++
      }
      return
    }

    if (line.type === 'event_msg' && line.payload && typeof line.payload === 'object') {
      const payload = line.payload as JsonMap
      const eventType = typeof payload.type === 'string' ? payload.type : ''
      if (eventType === 'user_message') {
        userCount++
        const message = typeof payload.message === 'string' ? payload.message : ''
        if (!firstPrompt && message) firstPrompt = message.slice(0, 500)
        if (timestamp) {
          userMessageTimestamps.push(timestamp)
          messageHours.push(new Date(timestamp).getHours())
        }
      } else if (eventType === 'agent_message') {
        agentMessageCount++
        const phase = typeof payload.phase === 'string' ? payload.phase : ''
        if (phase === 'commentary') commentaryCount++
        if (phase === 'final_answer') finalCount++
      } else if (eventType === 'token_count') {
        const info = payload.info && typeof payload.info === 'object' ? payload.info as JsonMap : undefined
        const usageRoot = info?.last_token_usage && typeof info.last_token_usage === 'object'
          ? info.last_token_usage as JsonMap
          : info?.total_token_usage && typeof info.total_token_usage === 'object'
            ? info.total_token_usage as JsonMap
            : undefined
        if (usageRoot) {
          inputTokens += Number(usageRoot.input_tokens ?? 0)
          outputTokens += Number(usageRoot.output_tokens ?? 0) + Number(usageRoot.reasoning_output_tokens ?? 0)
          cacheRead += Number(usageRoot.cached_input_tokens ?? 0)
        }
      } else if (eventType === 'turn_aborted') {
        abortedTurns++
      } else if (eventType === 'task_started' && payload.collaboration_mode_kind === 'plan') {
        planModeTurns++
      }
    }
  })

  if (!projectPath) projectPath = path.dirname(filePath)
  if (!threadId) threadId = sessionId
  const threadName = threadMap?.get(threadId)?.thread_name ?? basenameFromPath(projectPath)
  const start = startTime ? new Date(startTime).getTime() : 0
  const end = updatedAt ? new Date(updatedAt).getTime() : start

  return {
    session_id: sessionId,
    thread_id: threadId,
    thread_name: threadName,
    project_path: projectPath,
    start_time: startTime || updatedAt,
    updated_at: updatedAt,
    duration_minutes: start > 0 && end >= start ? (end - start) / 60_000 : 0,
    user_message_count: userCount,
    assistant_message_count: assistantCount,
    developer_message_count: developerCount,
    system_message_count: systemCount,
    agent_message_count: agentMessageCount,
    final_message_count: finalCount,
    commentary_message_count: commentaryCount,
    tool_counts: toolCounts,
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: cacheRead,
    first_prompt: firstPrompt,
    user_interruptions: abortedTurns,
    user_response_times: [],
    tool_errors: 0,
    tool_error_categories: {},
    uses_task_agent: usesTaskAgent,
    uses_mcp: usesMcp,
    uses_web_search: usesWeb,
    uses_web_fetch: usesWeb,
    lines_added: 0,
    lines_removed: 0,
    files_modified: 0,
    message_hours: messageHours,
    user_message_timestamps: userMessageTimestamps,
    originator,
    source,
    cli_version: cliVersion,
    model_provider: modelProvider,
    function_call_count: functionCallCount,
    aborted_turns: abortedTurns,
    plan_mode_turns: planModeTurns,
    has_compaction: false,
    has_thinking: hasThinking,
    available_artifacts: { replay: true, history: true, thread: Boolean(threadId) },
  }
}

export async function getSessions(): Promise<SessionMeta[]> {
  const threadMap = new Map((await readSessionIndex()).map((thread) => [thread.id, thread]))
  const files = await listSessionFiles()
  const results = await Promise.all(files.map((filePath) => readSessionSummary(filePath, threadMap)))
  return results
    .filter((item): item is SessionMeta => Boolean(item))
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
}

export async function readAllSessionMeta(): Promise<SessionMeta[]> {
  return getSessions()
}

export async function readSessionMeta(sessionId: string): Promise<SessionMeta | null> {
  const sessions = await getSessions()
  return sessions.find((session) => session.session_id === sessionId) ?? null
}

export async function readAllFacets(): Promise<Facet[]> {
  return []
}

export async function readFacet(): Promise<Facet | null> {
  return null
}

export async function findSessionJSONL(sessionId: string): Promise<string | null> {
  const files = await listSessionFiles()
  for (const filePath of files) {
    if (path.basename(filePath, '.jsonl') === sessionId) return filePath
  }
  return null
}

export async function findSessionSlug(sessionId: string): Promise<string | null> {
  const session = await readSessionMeta(sessionId)
  return session?.thread_id ?? null
}

export async function listProjectSlugs(): Promise<string[]> {
  const sessions = await getSessions()
  return [...new Set(sessions.map((session) => session.project_path))]
}

export async function listProjectJSONLFiles(slug: string): Promise<string[]> {
  const files = await listSessionFiles()
  const summaries = await Promise.all(files.map((filePath) => readSessionSummary(filePath)))
  return files.filter((_filePath, index) => summaries[index]?.project_path === slug)
}

export async function resolveProjectPath(slug: string): Promise<string> {
  return slug
}

export async function readStatsCache(): Promise<StatsCache | null> {
  const sessions = await getSessions()
  if (sessions.length === 0) return emptyStats()

  const dailyMap = new Map<string, { messages: number; sessions: number; tools: number; models: Record<string, number> }>()
  const modelUsage: Record<string, ModelUsage> = {}
  const hourCounts: Record<string, number> = {}
  let totalMessages = 0
  let longest = { sessionId: '', duration: 0, messageCount: 0, timestamp: '' }

  for (const session of sessions) {
    const date = session.start_time.slice(0, 10)
    const messageCount = session.user_message_count + session.assistant_message_count
    const toolCallCount = Object.values(session.tool_counts).reduce((sum, count) => sum + count, 0)
    const model = session.model_provider || 'unknown'
    totalMessages += messageCount

    const daily = dailyMap.get(date) ?? { messages: 0, sessions: 0, tools: 0, models: {} }
    daily.messages += messageCount
    daily.sessions += 1
    daily.tools += toolCallCount
    daily.models[model] = (daily.models[model] ?? 0) + session.input_tokens + session.output_tokens
    dailyMap.set(date, daily)

    modelUsage[model] = modelUsage[model] ?? {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      costUSD: 0,
      webSearchRequests: 0,
    }
    modelUsage[model].inputTokens += session.input_tokens
    modelUsage[model].outputTokens += session.output_tokens
    modelUsage[model].cacheReadInputTokens += session.cache_read_input_tokens ?? 0

    for (const hour of session.message_hours) {
      hourCounts[String(hour)] = (hourCounts[String(hour)] ?? 0) + 1
    }

    if (session.duration_minutes > longest.duration) {
      longest = {
        sessionId: session.session_id,
        duration: session.duration_minutes,
        messageCount,
        timestamp: session.start_time,
      }
    }
  }

  const dailyActivity: DailyActivity[] = [...dailyMap.entries()]
    .map(([date, value]) => ({
      date,
      messageCount: value.messages,
      sessionCount: value.sessions,
      toolCallCount: value.tools,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const tokensByDate: DailyTokens[] = [...dailyMap.entries()]
    .map(([date, value]) => ({
      date,
      tokensByModel: value.models,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    version: 1,
    lastComputedDate: new Date().toISOString(),
    dailyActivity,
    tokensByDate,
    modelUsage,
    totalSessions: sessions.length,
    totalMessages,
    longestSession: longest,
    firstSessionDate: sessions[sessions.length - 1]?.start_time ?? sessions[0]?.start_time ?? '',
    hourCounts,
    totalSpeculationTimeSavedMs: 0,
  }
}

export async function readReplay(sessionId: string): Promise<ReplayData | null> {
  const jsonlPath = await findSessionJSONL(sessionId)
  if (!jsonlPath) return null

  const turns: ReplayTurn[] = []
  const summaries: SummaryEvent[] = []
  let threadId = ''
  let cliVersion = ''
  let source = ''
  let originator = ''
  let modelProvider = ''

  await readJSONLLines(jsonlPath, (line) => {
    const timestamp = typeof line.timestamp === 'string' ? line.timestamp : ''
    if (line.type === 'session_meta' && line.payload && typeof line.payload === 'object') {
      const payload = line.payload as JsonMap
      threadId = typeof payload.id === 'string' ? payload.id : threadId
      cliVersion = typeof payload.cli_version === 'string' ? payload.cli_version : cliVersion
      source = typeof payload.source === 'string' ? payload.source : source
      originator = typeof payload.originator === 'string' ? payload.originator : originator
      modelProvider = typeof payload.model_provider === 'string' ? payload.model_provider : modelProvider
      return
    }

    if (line.type === 'response_item' && line.payload && typeof line.payload === 'object') {
      const payload = line.payload as JsonMap
      const payloadType = typeof payload.type === 'string' ? payload.type : ''
      if (payloadType === 'message') {
        const role = typeof payload.role === 'string' ? payload.role : 'assistant'
        turns.push({
          uuid: typeof payload.id === 'string' ? payload.id : `${role}-${turns.length}`,
          parentUuid: null,
          type: role === 'user' || role === 'assistant' || role === 'developer' ? role : 'system',
          timestamp,
          text: extractText(Array.isArray(payload.content) ? payload.content : []),
          phase: typeof payload.phase === 'string' ? payload.phase : undefined,
        })
      } else if (payloadType === 'function_call') {
        const args = typeof payload.arguments === 'string' ? safeJsonParse(payload.arguments) ?? {} : {}
        turns.push({
          uuid: typeof payload.call_id === 'string' ? payload.call_id : `call-${turns.length}`,
          parentUuid: null,
          type: 'assistant',
          timestamp,
          text: `Called ${String(payload.name ?? 'tool')}`,
          tool_calls: [{
            id: typeof payload.call_id === 'string' ? payload.call_id : `call-${turns.length}`,
            name: String(payload.name ?? 'tool'),
            input: args,
          }],
        })
      } else if (payloadType === 'function_call_output') {
        turns.push({
          uuid: typeof payload.call_id === 'string' ? `${payload.call_id}-output` : `output-${turns.length}`,
          parentUuid: typeof payload.call_id === 'string' ? payload.call_id : null,
          type: 'system',
          timestamp,
          text: typeof payload.output === 'string' ? payload.output : '',
        })
      } else if (payloadType === 'reasoning') {
        turns.push({
          uuid: `reasoning-${turns.length}`,
          parentUuid: null,
          type: 'assistant',
          timestamp,
          text: 'Reasoning step',
          has_thinking: true,
        })
      }
      return
    }

    if (line.type === 'event_msg' && line.payload && typeof line.payload === 'object') {
      const payload = line.payload as JsonMap
      const eventType = typeof payload.type === 'string' ? payload.type : ''
      if (eventType === 'user_message') {
        turns.push({ uuid: `user-${turns.length}`, parentUuid: null, type: 'user', timestamp, text: typeof payload.message === 'string' ? payload.message : '' })
      } else if (eventType === 'agent_message') {
        turns.push({
          uuid: `agent-${turns.length}`,
          parentUuid: null,
          type: 'assistant',
          timestamp,
          text: typeof payload.message === 'string' ? payload.message : '',
          phase: typeof payload.phase === 'string' ? payload.phase : undefined,
        })
      } else if (eventType === 'token_count') {
        const info = payload.info && typeof payload.info === 'object' ? payload.info as JsonMap : undefined
        const usageRoot = info?.last_token_usage && typeof info.last_token_usage === 'object'
          ? info.last_token_usage as JsonMap
          : info?.total_token_usage && typeof info.total_token_usage === 'object'
            ? info.total_token_usage as JsonMap
            : undefined
        turns.push({ uuid: `token-${turns.length}`, parentUuid: null, type: 'system', timestamp, text: 'Token usage updated', usage: usageFromTokenCount(usageRoot) })
      } else if (eventType === 'turn_aborted') {
        turns.push({ uuid: `aborted-${turns.length}`, parentUuid: null, type: 'system', timestamp, text: 'Turn aborted' })
      }
    }
  })

  const threadName = new Map((await readSessionIndex()).map((thread) => [thread.id, thread.thread_name])).get(threadId) ?? threadId
  return {
    session_id: sessionId,
    thread_id: threadId || sessionId,
    thread_name: threadName || basenameFromPath(sessionId),
    originator,
    source,
    cli_version: cliVersion,
    model_provider: modelProvider,
    turns,
    compactions: [],
    summaries,
    total_cost: 0,
  }
}

export async function readSettings(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(codexPath('config.toml'), 'utf-8')
    const lines = raw.split(/\r?\n/)
    const result: Record<string, unknown> = {
      raw,
      projects: [],
      plugins: [],
      env: {},
      features: {},
      windows: {},
      agents: {},
    }
    let section = ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const sectionMatch = trimmed.match(/^\[(.+)\]$/)
      if (sectionMatch) {
        section = sectionMatch[1]
        continue
      }
      const keyValue = trimmed.match(/^([A-Za-z0-9_."\\?:@-]+)\s*=\s*(.+)$/)
      if (!keyValue) continue
      const key = keyValue[1]
      const value = keyValue[2].trim().replace(/^"|"$/g, '')
      if (!section) {
        result[key] = value
      } else if (section.startsWith('projects.')) {
        ;(result.projects as Array<Record<string, string>>).push({ path: section.replace(/^projects\./, ''), [key]: value })
      } else if (section.startsWith('plugins.')) {
        ;(result.plugins as Array<Record<string, string>>).push({ id: section.replace(/^plugins\./, ''), [key]: value })
      } else {
        const current = result[section] as Record<string, string> | undefined
        result[section] = { ...(current ?? {}), [key]: value }
      }
    }
    return result
  } catch {
    return {}
  }
}

export async function readSkills(): Promise<SkillInfo[]> {
  const results: SkillInfo[] = []
  try {
    const entries = await fs.readdir(codexPath('skills'), { withFileTypes: true })
    for (const entry of entries.filter((item) => item.isDirectory() && !item.name.startsWith('.'))) {
      const skillMdPath = codexPath('skills', entry.name, 'SKILL.md')
      let description = ''
      let triggers = ''
      let hasSkillMd = false
      try {
        const raw = await fs.readFile(skillMdPath, 'utf-8')
        hasSkillMd = true
        description = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? ''
        triggers = raw.match(/(?:TRIGGER|trigger)[^\n]*\n([\s\S]*?)(?:\n#{1,3}\s|\n---|$)/m)?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 200) ?? ''
      } catch {
        // ignore
      }
      results.push({ name: entry.name, description, triggers, hasSkillMd })
    }
  } catch {
    // ignore
  }
  return results.sort((a, b) => a.name.localeCompare(b.name))
}

export async function readInstalledPlugins(): Promise<PluginInfo[]> {
  const files = await listFilesRecursive(codexPath('plugins'))
  return files
    .filter((filePath) => filePath.endsWith('plugin.json'))
    .map((filePath) => ({
      id: basenameFromPath(path.dirname(path.dirname(filePath))),
      scope: 'local',
      version: 'unknown',
      installedAt: '',
    }))
}

export async function readPrompts(): Promise<PromptInfo[]> {
  try {
    const files = await fs.readdir(codexPath('prompts'))
    return files
      .filter((name) => name.endsWith('.md'))
      .map((name) => ({ name: name.replace(/\.md$/, ''), path: codexPath('prompts', name) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export async function readMemories(): Promise<MemoryEntry[]> {
  const files = await listFilesRecursive(codexPath('memories'))
  const results: MemoryEntry[] = []
  for (const filePath of files.filter((value) => value.endsWith('.md'))) {
    try {
      const [body, stat] = await Promise.all([fs.readFile(filePath, 'utf-8'), fs.stat(filePath)])
      results.push({
        file: path.basename(filePath),
        projectSlug: '',
        projectPath: filePath,
        name: path.basename(filePath, '.md'),
        type: 'memory',
        description: '',
        body,
        mtime: stat.mtime.toISOString(),
        isIndex: false,
      })
    } catch {
      // ignore
    }
  }
  return results.sort((a, b) => b.mtime.localeCompare(a.mtime))
}

export async function readPlans(): Promise<PlanFile[]> {
  return []
}

export async function readTodos(): Promise<TodoFile[]> {
  return []
}

export async function getClaudeStorageBytes(): Promise<number> {
  return getCodexStorageBytes()
}

export async function getCodexStorageBytes(): Promise<number> {
  const files = await listFilesRecursive(CODEX_DIR)
  let total = 0
  await Promise.all(files.map(async (filePath) => {
    try {
      const stat = await fs.stat(filePath)
      total += stat.size
    } catch {
      // ignore
    }
  }))
  return total
}
