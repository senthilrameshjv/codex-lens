import { NextResponse } from 'next/server'
import { getCodexStorageBytes, readInstalledPlugins, readPrompts, readSessionIndex, readSettings, readSkills } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [settings, storageBytes, skills, plugins, prompts, threads] = await Promise.all([
    readSettings(),
    getCodexStorageBytes(),
    readSkills(),
    readInstalledPlugins(),
    readPrompts(),
    readSessionIndex(),
  ])
  return NextResponse.json({ settings, storageBytes, skills, plugins, prompts, threads })
}
