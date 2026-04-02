import { NextResponse } from 'next/server'
import { readReplay } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const replay = await readReplay(id)
  if (!replay) {
    return NextResponse.json({ error: 'Replay not found' }, { status: 404 })
  }
  return NextResponse.json(replay)
}
