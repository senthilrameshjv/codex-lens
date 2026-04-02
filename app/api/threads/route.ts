import { NextResponse } from 'next/server'
import { readSessionIndex } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ threads: await readSessionIndex() })
}
