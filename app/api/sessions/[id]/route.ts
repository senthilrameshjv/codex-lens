import { NextResponse } from 'next/server'
import { readSessionMeta } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await readSessionMeta(id)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  return NextResponse.json({ session: { ...session, estimated_cost: 0 } })
}
