import { NextResponse } from 'next/server'
import { readMemories } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ memories: await readMemories() })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Editing Codex memories is not supported in v1' }, { status: 501 })
}
