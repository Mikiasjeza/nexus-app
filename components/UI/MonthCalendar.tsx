'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

type Props = {
  /** ISO timestamps; each one marks its day (in the viewer's time zone). */
  activity: string[]
  /** What one timestamp is, for the day labels: "action" → "3 actions". */
  unit?: string
  /** Lets the viewer page back through earlier months. */
  navigable?: boolean
  className?: string
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Deeper orange for busier days, using the same scale as the activity heatmap. */
function dayFill(count: number): string | undefined {
  if (count <= 0) return undefined
  if (count === 1) return 'var(--chart-scale-03)'
  if (count === 2) return 'var(--chart-scale-04)'
  return 'var(--chart-scale-05)'
}

/**
 * One month as a card of day tiles, active days filled in orange. A double
 * frame (hairline outside, inset highlight inside) sets it apart from the
 * flat panels around it.
 */
export default function MonthCalendar({
  activity,
  unit = 'action',
  navigable = false,
  className = '',
}: Props) {
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(() => startOfMonth(today))

  const counts = useMemo(() => {
    const map = new Map<number, number>()
    for (const timestamp of activity) {
      const date = new Date(timestamp)
      if (date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()) {
        map.set(date.getDate(), (map.get(date.getDate()) ?? 0) + 1)
      }
    }
    return map
  }, [activity, month])

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = month.getDay()
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()
  const activeDays = counts.size
  const monthLabel = month.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const plural = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`

  return (
    <div
      className={`rounded-[1.5rem] border border-line p-2 transition-colors duration-100 hover:border-verified/40 ${className}`}
    >
      <div className="rounded-2xl border border-line p-4 shadow-[inset_0_2px_1.5px_rgba(233,228,218,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <span className="font-medium">{monthLabel}</span>
            <span className="size-1 rounded-full bg-ink-faint" aria-hidden />
            <span className="text-xs text-ink-faint">
              {activeDays} active {activeDays === 1 ? 'day' : 'days'}
            </span>
          </p>
          {navigable && (
            <div className="flex gap-1">
              <button
                type="button"
                className="pill size-8 justify-center p-0"
                aria-label="Previous month"
                onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="pill size-8 justify-center p-0 disabled:opacity-40"
                aria-label="Next month"
                disabled={isCurrentMonth}
                onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2" role="grid" aria-label={monthLabel}>
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              role="columnheader"
              className="flex h-8 items-center justify-center text-[0.6875rem] font-medium text-ink-faint"
            >
              {name}
            </div>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} aria-hidden />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const count = counts.get(day) ?? 0
            const isToday = isCurrentMonth && day === today.getDate()
            const isFuture = isCurrentMonth && day > today.getDate()
            const fill = dayFill(count)
            return (
              <div
                key={day}
                role="gridcell"
                title={count ? plural(count) : undefined}
                aria-label={`${monthLabel.split(' ')[0]} ${day}: ${count ? plural(count) : 'nothing'}`}
                className={`tabular flex aspect-square min-h-8 items-center justify-center rounded-xl text-sm font-medium ${
                  // Cream reads on the deeper tiles, dark on full orange.
                  fill
                    ? count >= 3
                      ? 'text-ground'
                      : 'text-ink'
                    : isFuture
                      ? 'text-ink-faint/50'
                      : 'text-ink-faint'
                } ${isToday ? 'ring-1 ring-inset ring-ink' : ''}`}
                style={fill ? { background: fill } : undefined}
              >
                {day}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
