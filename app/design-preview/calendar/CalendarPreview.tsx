'use client'

import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '@/lib/api'
import type { DashboardSummary } from '@/lib/dashboard/summary'
import ActivityCalendar from '@/components/Dashboard/ActivityCalendar'
import PillarRings from '@/components/Dashboard/PillarRings'
import RecentChecks from '@/components/Dashboard/RecentChecks'
import VerifiedGrowth from '@/components/Dashboard/VerifiedGrowth'
import MonthCalendar from '@/components/UI/MonthCalendar'

const OPTIONS = [
  { id: 'side', label: 'A · Year and month side by side' },
  { id: 'month', label: 'B · Month instead of year' },
  { id: 'column', label: 'C · Under recent checks' },
] as const

type OptionId = (typeof OPTIONS)[number]['id']

export default function CalendarPreview() {
  const [option, setOption] = useState<OptionId>('side')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    dashboardApi.getSummary().then(setSummary)
  }, [])

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Calendar placement">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className="pill"
              aria-pressed={option === o.id}
              onClick={() => setOption(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-faint">
          The lower half of the dashboard, with the calendar placed three ways. Sample data.
        </p>
      </div>

      {summary && (
        <div className="pt-10">
          {option === 'side' && <SideBySide summary={summary} />}
          {option === 'month' && <MonthInstead summary={summary} />}
          {option === 'column' && <UnderRecentChecks summary={summary} />}
        </div>
      )}
    </div>
  )
}

function TopRow({ summary, third }: { summary: DashboardSummary; third: React.ReactNode }) {
  return (
    <div className="grid gap-12 lg:grid-cols-3 lg:gap-10">
      <section>
        <Heading note="Last 12 weeks">Verified skills</Heading>
        <p className="mt-4 flex items-baseline gap-3">
          <span className="display-number text-[4.5rem] leading-none">
            {summary.totals.verified}
          </span>
          <span className="text-ink-muted">of {summary.totals.claimed} skills</span>
        </p>
        <VerifiedGrowth points={summary.verifiedOverTime} />
      </section>
      <section>
        <Heading note="Verified out of claimed">By pillar</Heading>
        <PillarRings pillars={summary.pillars} />
      </section>
      <section>{third}</section>
    </div>
  )
}

function SideBySide({ summary }: { summary: DashboardSummary }) {
  return (
    <>
      <TopRow
        summary={summary}
        third={
          <>
            <Heading>Recent checks</Heading>
            <RecentChecks checks={summary.recentChecks} />
          </>
        }
      />
      <section className="mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <Heading note="Checks run and changes made">Activity</Heading>
          <ActivityCalendar activity={summary.activity} />
        </div>
        <div>
          <Heading note="Day by day">This month</Heading>
          <MonthCalendar activity={summary.activity} navigable className="mt-6" />
        </div>
      </section>
    </>
  )
}

function MonthInstead({ summary }: { summary: DashboardSummary }) {
  const stats = useMemo(() => monthStats(summary.activity), [summary.activity])
  return (
    <>
      <TopRow
        summary={summary}
        third={
          <>
            <Heading>Recent checks</Heading>
            <RecentChecks checks={summary.recentChecks} />
          </>
        }
      />
      <section className="mt-16 grid items-start gap-10 border-t border-line pt-10 lg:grid-cols-3">
        <div>
          <Heading>This month</Heading>
          <p className="mt-4 flex items-baseline gap-3">
            <span className="display-number text-[4.5rem] leading-none">{stats.activeDays}</span>
            <span className="text-ink-muted">active days</span>
          </p>
          <p className="mt-4 max-w-[22rem] text-sm leading-relaxed text-ink-muted">
            {stats.busiest
              ? `${stats.actions} checks and changes so far. Your busiest day was ${stats.busiest}.`
              : 'Nothing yet this month. A check or a new piece of proof counts.'}
          </p>
        </div>
        <MonthCalendar
          activity={summary.activity}
          navigable
          className="lg:col-span-2 lg:max-w-[34rem]"
        />
      </section>
    </>
  )
}

function UnderRecentChecks({ summary }: { summary: DashboardSummary }) {
  return (
    <>
      <TopRow
        summary={summary}
        third={
          <>
            <Heading>Recent checks</Heading>
            <RecentChecks checks={summary.recentChecks} />
            <MonthCalendar activity={summary.activity} className="mt-8" />
          </>
        }
      />
      <section className="mt-16 border-t border-line pt-10">
        <Heading note="Checks run and changes made">Activity</Heading>
        <ActivityCalendar activity={summary.activity} />
      </section>
    </>
  )
}

function Heading({ note, children }: { note?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-base font-medium">{children}</h2>
      {note && <span className="text-sm text-ink-faint">{note}</span>}
    </div>
  )
}

function monthStats(activity: string[]) {
  const now = new Date()
  const byDay = new Map<number, number>()
  for (const timestamp of activity) {
    const date = new Date(timestamp)
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      byDay.set(date.getDate(), (byDay.get(date.getDate()) ?? 0) + 1)
    }
  }
  let busiestDay = 0
  let busiestCount = 0
  for (const [day, count] of byDay) {
    if (count > busiestCount) [busiestDay, busiestCount] = [day, count]
  }
  const monthName = now.toLocaleString(undefined, { month: 'long' })
  return {
    activeDays: byDay.size,
    actions: [...byDay.values()].reduce((a, b) => a + b, 0),
    busiest: busiestDay ? `${monthName} ${busiestDay} (${busiestCount})` : null,
  }
}
