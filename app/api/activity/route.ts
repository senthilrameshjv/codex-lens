import { NextResponse } from 'next/server'
import { getSessions, readStatsCache } from '@/lib/claude-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [stats, sessions] = await Promise.all([readStatsCache(), getSessions()])
  if (!stats) {
    return NextResponse.json({ error: 'No activity available' }, { status: 404 })
  }

  const dow = [0, 0, 0, 0, 0, 0, 0]
  const activeDates = new Set<string>()
  for (const session of sessions) {
    const date = new Date(session.start_time)
    dow[date.getDay()] += 1
    activeDates.add(session.start_time.slice(0, 10))
  }

  return NextResponse.json({
    daily_activity: stats.dailyActivity,
    hour_counts: Array.from({ length: 24 }, (_, hour) => ({ hour, count: stats.hourCounts[String(hour)] ?? 0 })),
    dow_counts: dow.map((count, index) => ({ day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index], count })),
    streaks: { current: 0, longest: 0 },
    most_active_day: stats.dailyActivity.sort((a, b) => b.messageCount - a.messageCount)[0]?.date ?? '',
    most_active_day_msgs: stats.dailyActivity.sort((a, b) => b.messageCount - a.messageCount)[0]?.messageCount ?? 0,
    total_active_days: activeDates.size,
  })
}
