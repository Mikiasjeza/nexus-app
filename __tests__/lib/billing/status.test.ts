/**
 * @jest-environment node
 */

import {
  PAST_DUE_GRACE_DAYS,
  effectivePlan,
  isLiveStatus,
  normalizeStatus,
} from '@/lib/billing/status'
import { recentWindows, usageWindow } from '@/lib/billing/period'

const now = new Date('2026-11-15T12:00:00Z')
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000)

describe('effectivePlan', () => {
  it('grants the plan for active and trialing subscriptions', () => {
    expect(effectivePlan({ plan: 'pro', status: 'active' }, now)).toBe('pro')
    expect(effectivePlan({ plan: 'pro', status: 'trialing' }, now)).toBe('pro')
  })

  it('is Free without a subscription or for a free row', () => {
    expect(effectivePlan(null, now)).toBe('free')
    expect(effectivePlan({ plan: 'free', status: 'active' }, now)).toBe('free')
  })

  it('keeps a past-due plan during the grace period after the failed renewal, then drops it', () => {
    expect(
      effectivePlan({ plan: 'pro', status: 'past_due', currentPeriodStart: daysAgo(3) }, now)
    ).toBe('pro')
    expect(
      effectivePlan(
        { plan: 'pro', status: 'past_due', currentPeriodStart: daysAgo(PAST_DUE_GRACE_DAYS + 1) },
        now
      )
    ).toBe('free')
    expect(effectivePlan({ plan: 'pro', status: 'past_due' }, now)).toBe('free')
  })

  it('grants nothing for unpaid, incomplete, paused, cancelled or unknown statuses', () => {
    for (const status of [
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused',
      'canceled',
      'weird',
    ]) {
      expect(effectivePlan({ plan: 'pro', status }, now)).toBe('free')
    }
  })

  it('reads a retired plan name', () => {
    expect(effectivePlan({ plan: 'enterprise', status: 'active' }, now)).toBe('career_plus')
  })
})

describe('subscription statuses', () => {
  it('treats unknown statuses as incomplete', () => {
    expect(normalizeStatus('something_new')).toBe('incomplete')
    expect(normalizeStatus(undefined)).toBe('incomplete')
  })

  it('calls a subscription live while it can still bill', () => {
    expect(isLiveStatus('active')).toBe(true)
    expect(isLiveStatus('past_due')).toBe(true)
    expect(isLiveStatus('unpaid')).toBe(true)
    expect(isLiveStatus('incomplete')).toBe(true)
    expect(isLiveStatus('canceled')).toBe(false)
    expect(isLiveStatus('incomplete_expired')).toBe(false)
  })
})

describe('usage window', () => {
  it('runs from the 1st of the month to the 1st of the next, in UTC', () => {
    const window = usageWindow(new Date('2026-11-30T23:59:59Z'))
    expect(window.start.toISOString()).toBe('2026-11-01T00:00:00.000Z')
    expect(window.end.toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })

  it('rolls over at midnight UTC on the 1st', () => {
    expect(usageWindow(new Date('2026-12-01T00:00:00Z')).start.toISOString()).toBe(
      '2026-12-01T00:00:00.000Z'
    )
  })

  it('lists recent months newest first, across a year boundary', () => {
    const windows = recentWindows(3, new Date('2026-01-10T00:00:00Z'))
    expect(windows.map((w) => w.start.toISOString().slice(0, 7))).toEqual([
      '2026-01',
      '2025-12',
      '2025-11',
    ])
  })
})
