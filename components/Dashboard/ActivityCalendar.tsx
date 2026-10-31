'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  HeatmapCells,
  HeatmapChart,
  type HeatmapColumn,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from '@/components/charts/heatmap'

type Props = {
  /** One ISO timestamp per check run or change made. */
  activity: string[]
}

/** Whole months shown before the current one: a year wide, four months on a phone. */
const WIDE_MONTHS_BACK = 11
const NARROW_MONTHS_BACK = 3

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/**
 * Week columns (Sunday first) from the first Sunday of a month through this
 * week, counted in the viewer's own time zone. Starting on a whole month keeps
 * a one-column sliver of the previous month from crowding the first label.
 */
function buildColumns(activity: string[], monthsBack: number, today: Date) {
  const counts = new Map<string, number>()
  for (const timestamp of activity) {
    const key = dayKey(new Date(timestamp))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const firstOfMonth = new Date(end.getFullYear(), end.getMonth() - monthsBack, 1)
  const start = new Date(firstOfMonth)
  start.setDate(1 + ((7 - firstOfMonth.getDay()) % 7))
  // Round to whole days first so a daylight-saving hour can't drop the last week.
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  const weeks = Math.floor(days / 7) + 1

  const columns: HeatmapColumn[] = []
  for (let week = 0; week < weeks; week++) {
    const bins = []
    for (let day = 0; day < 7; day++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + day)
      bins.push({ bin: day, count: counts.get(dayKey(date)) ?? 0, date })
    }
    columns.push({ bin: week, bins })
  }
  return { columns, domain: [start, end] as [Date, Date] }
}

export default function ActivityCalendar({ activity }: Props) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const monthsBack = narrow ? NARROW_MONTHS_BACK : WIDE_MONTHS_BACK
  const { columns, domain } = useMemo(
    () => buildColumns(activity, monthsBack, new Date()),
    [activity, monthsBack]
  )

  return (
    <div className="mt-6">
      <HeatmapChart data={columns} xDomain={domain} gap={3} animationDuration={700}>
        <HeatmapCells cornerRadius={2} hideGhostCells />
        <HeatmapXAxis />
        <HeatmapYAxis />
        <HeatmapTooltip
          formatLabel={(count) =>
            count === 0 ? 'Nothing that day' : `${count} ${count === 1 ? 'action' : 'actions'}`
          }
        />
      </HeatmapChart>
    </div>
  )
}
