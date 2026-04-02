export type ToolCategory =
  | 'file-io'
  | 'shell'
  | 'agent'
  | 'web'
  | 'planning'
  | 'mcp'
  | 'system'
  | 'other'

export const CATEGORY_COLORS: Record<ToolCategory, string> = {
  'file-io': '#60a5fa',
  'shell': '#d97706',
  'agent': '#a78bfa',
  'web': '#22c55e',
  'planning': '#fbbf24',
  'mcp': '#34d399',
  'system': '#f87171',
  'other': '#6b7280',
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  'file-io': 'File I/O',
  'shell': 'Shell',
  'agent': 'Agents',
  'web': 'Web',
  'planning': 'Planning',
  'mcp': 'MCP',
  'system': 'System',
  'other': 'Other',
}

export function categorizeTool(name: string): ToolCategory {
  if (name.startsWith('mcp__')) return 'mcp'
  if (name.includes('shell')) return 'shell'
  if (name.includes('agent') || ['spawn_agent', 'send_input', 'wait_agent', 'resume_agent', 'close_agent'].includes(name)) return 'agent'
  if (name.includes('plan') || name === 'update_plan' || name === 'request_user_input') return 'planning'
  if (name.includes('weather') || name.includes('search') || name.includes('web')) return 'web'
  if (name.includes('read_') || name.includes('fetch') || name.includes('find') || name.includes('open')) return 'file-io'
  if (name.includes('comment') || name.includes('reaction')) return 'system'
  return 'other'
}

export function isMcpTool(name: string): boolean {
  return name.startsWith('mcp__')
}

export function parseMcpTool(name: string): { server: string; tool: string } | null {
  if (!isMcpTool(name)) return null
  const parts = name.split('__')
  if (parts.length < 3) return null
  return { server: parts[1], tool: parts.slice(2).join('__') }
}

export function toolDisplayName(name: string): string {
  const parsed = parseMcpTool(name)
  return parsed ? `${parsed.server} · ${parsed.tool}` : name
}

export const TOOL_ICONS: Record<ToolCategory, string> = {
  'file-io': 'F',
  'shell': 'S',
  'agent': 'A',
  'web': 'W',
  'planning': 'P',
  'mcp': 'M',
  'system': 'Y',
  'other': '?',
}
