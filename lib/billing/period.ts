/**
 * Allowances reset on the first day of every month at 00:00 UTC, on every
 * plan. Upgrading raises this month's allowance straight away; what was
 * already used still counts.
 */

export interface UsageWindow {
  start: Date
  end: Date
}

export function usageWindow(now: Date = new Date()): UsageWindow {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  }
}

/** The first days of this month and the `count - 1` months before it, newest first. */
export function recentWindows(count: number, now: Date = new Date()): UsageWindow[] {
  return Array.from({ length: count }, (_, i) =>
    usageWindow(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)))
  )
}
