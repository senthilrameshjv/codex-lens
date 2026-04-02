'use client'

import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import { ActivityHeatmap } from '@/components/overview/activity-heatmap'
import { PeakHoursChart } from '@/components/overview/peak-hours-chart'
import { DayOfWeekChart } from '@/components/activity/day-of-week-chart'
import { StreakCard } from '@/components/activity/streak-card'
import { UsageOverTimeChart } from '@/components/overview/usage-over-time-chart'
import type { DailyActivity } from '@/types/claude'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ActivityData {
  daily_activity: DailyActivity[]
  hour_counts: Array<{ hour: number; count: number }>
  dow_counts: Array<{ day: string; count: number }>
  streaks: { current: number; longest: number }
  most_active_day: string
  most_active_day_msgs: number
  total_active_days: number
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-card p-4">
      <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function ActivityPage() {
  const { data, error, isLoading } = useSWR<ActivityData>('/api/activity', fetcher, { refreshInterval: 5_000 })
  const hourCounts = data ? Object.fromEntries(data.hour_counts.map((hour) => [String(hour.hour), hour.count])) : {}

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="codex-lens · activity" subtitle="patterns, heatmaps, and peak hours" />
      <div className="p-6 space-y-6">
        {error && <p className="text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && <p className="text-sm font-mono text-muted-foreground">loading activity...</p>}
        {data && (
          <>
            <Card title="Streaks & Highlights">
              <StreakCard
                current={data.streaks.current}
                longest={data.streaks.longest}
                totalActiveDays={data.total_active_days}
                mostActiveDay={data.most_active_day}
                mostActiveDayMsgs={data.most_active_day_msgs}
              />
            </Card>
            <Card title="Activity Calendar">
              <ActivityHeatmap data={data.daily_activity} />
            </Card>
            <Card title="Usage Over Time">
              <UsageOverTimeChart data={data.daily_activity} days={90} />
            </Card>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card title="Peak Hours">
                <PeakHoursChart hourCounts={hourCounts} />
              </Card>
              <Card title="Day Of Week">
                <DayOfWeekChart data={data.dow_counts} />
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
