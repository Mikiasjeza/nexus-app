'use client'

import { useMemo } from 'react'
import { useReducedMotion } from 'motion/react'
import { Bar } from '@/components/charts/bar'
import { BarChart } from '@/components/charts/bar-chart'
import { BarXAxis } from '@/components/charts/bar-x-axis'
import { Grid } from '@/components/charts/grid'
import { ChartTooltip } from '@/components/charts/tooltip'
import { YAxis } from '@/components/charts/y-axis'
import { CHART_ENTER_MS } from '@/components/Dashboard/chart-settings'

export type DailySegment = {
  /** Key of the number in each day. */
  key: string
  label: string
  /** A chart token, e.g. "var(--chart-1)". */
  color: string
}

type Day = { date: string } & Record<string, string | number>

type Props = {
  /** One entry per day, oldest first; `date` is yyyy-mm-dd (UTC). */
  days: Day[]
  /** One segment is a plain column chart; more are stacked, first at the bottom. */
  segments: DailySegment[]
  /** Names the chart for the table view and for screen readers. */
  caption: string
  /** Shown instead of an empty plot when every day is zero. */
  emptyMessage: string
}

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

const wholeNumber = (value: number) => (Number.isInteger(value) ? value.toLocaleString() : '')

/**
 * A count for each of the last days, as thin columns. Values are also in the
 * tooltip and in a table underneath, so nothing depends on hovering or on
 * telling colours apart.
 */
export default function DailyBars({ days, segments, caption, emptyMessage }: Props) {
  const reduce = useReducedMotion()
  const data = useMemo(
    () =>
      days.map((day) => ({
        ...Object.fromEntries(segments.map((s) => [s.key, Number(day[s.key]) || 0])),
        label: dayLabel(day.date),
      })),
    [days, segments]
  )
  const valueOf = (day: Day, key: string) => Number(day[key]) || 0
  const busyDays = days.filter((day) => segments.some((s) => valueOf(day, s.key) > 0))

  if (busyDays.length === 0) {
    return <p className="mt-6 border-y border-line py-8 text-sm text-ink-muted">{emptyMessage}</p>
  }

  const stacked = segments.length > 1

  return (
    <div>
      {stacked && (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5" style={{ background: segment.color }} />
              {segment.label}
            </li>
          ))}
        </ul>
      )}

      {/* The table below says the same thing in words. */}
      <div aria-hidden>
        <BarChart
          data={data}
          xDataKey="label"
          stacked={stacked}
          stackGap={stacked ? 2 : 0}
          aspectRatio="5 / 2"
          animationDuration={CHART_ENTER_MS}
          margin={{ top: 16, right: 8, bottom: 32, left: 32 }}
          barGap={0.45}
          className="mt-4"
        >
          <Grid horizontal numTicksRows={3} />
          {segments.map((segment) => (
            <Bar
              key={segment.key}
              dataKey={segment.key}
              fill={segment.color}
              lineCap={4}
              animate={!reduce}
            />
          ))}
          <BarXAxis maxLabels={{ base: 4, md: 6 }} />
          <YAxis numTicks={3} formatValue={wholeNumber} />
          <ChartTooltip
            showDatePill={false}
            rows={(point) =>
              segments.map((segment) => ({
                color: segment.color,
                label: segment.label,
                value: Number(point[segment.key]) || 0,
              }))
            }
          />
        </BarChart>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-faint transition-colors hover:text-ink">
          Show as a table
        </summary>
        <table className="mt-3 w-full max-w-md text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-ink-faint">
              <th scope="col" className="py-2 pr-4 font-normal">
                Day
              </th>
              {segments.map((segment) => (
                <th key={segment.key} scope="col" className="py-2 pr-4 text-right font-normal">
                  {segment.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {busyDays.map((day) => (
              <tr key={day.date} className="border-b border-line">
                <th scope="row" className="py-2 pr-4 font-normal text-ink-muted">
                  {dayLabel(day.date)}
                </th>
                {segments.map((segment) => (
                  <td key={segment.key} className="tabular py-2 pr-4 text-right">
                    {valueOf(day, segment.key).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-faint">Days not listed had none.</p>
      </details>
    </div>
  )
}
