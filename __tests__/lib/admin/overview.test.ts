/**
 * @jest-environment node
 */

import { fillDays, signInMethods } from '@/lib/admin/overview'
import { attemptOutcome, count, timeAgo } from '@/components/Admin/format'

jest.mock('@/lib/db', () => ({ prisma: {} }))

describe('fillDays', () => {
  const from = new Date('2026-11-01T00:00:00Z')

  it('gives one entry per day, oldest first, with blanks where nothing happened', () => {
    const days = fillDays(
      [
        { day: new Date('2026-11-01T00:00:00Z'), count: 2 },
        { day: new Date('2026-11-03T00:00:00Z'), count: 5 },
      ],
      from,
      4,
      { count: 0 }
    )
    expect(days).toEqual([
      { date: '2026-11-01', count: 2 },
      { date: '2026-11-02', count: 0 },
      { date: '2026-11-03', count: 5 },
      { date: '2026-11-04', count: 0 },
    ])
  })

  it('keeps every number a row carries', () => {
    const [day] = fillDays([{ day: from, started: 3, passed: 1 }], from, 1, {
      started: 0,
      passed: 0,
    })
    expect(day).toEqual({ date: '2026-11-01', started: 3, passed: 1 })
  })

  it('crosses a month end without skipping or repeating a day', () => {
    const days = fillDays([], new Date('2026-10-30T00:00:00Z'), 4, { count: 0 })
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })
})

describe('signInMethods', () => {
  it('names linked sign-in providers in button order, ignoring GitHub', () => {
    expect(signInMethods(['linkedin', 'github', 'google'])).toEqual(['Google', 'LinkedIn'])
  })

  it('says Email when nothing is linked', () => {
    expect(signInMethods([])).toEqual(['Email'])
    expect(signInMethods(['github'])).toEqual(['Email'])
  })
})

describe('admin formatting', () => {
  const now = Date.parse('2026-11-11T12:00:00Z')

  it('says how long ago, or Never', () => {
    expect(timeAgo(null, now)).toBe('Never')
    expect(timeAgo('2026-11-11T11:59:50Z', now)).toBe('Just now')
    expect(timeAgo('2026-11-11T09:00:00Z', now)).toMatch(/3 hours ago/)
    expect(timeAgo('2026-11-08T12:00:00Z', now)).toMatch(/3 days ago/)
  })

  it('describes an attempt by its result once finished, by its stage before', () => {
    expect(attemptOutcome('COMPLETED', 'PASSED')).toBe('Passed')
    expect(attemptOutcome('COMPLETED', 'NOT_PASSED')).toBe('Not passed')
    expect(attemptOutcome('IN_PROGRESS', null)).toBe('In progress')
    expect(attemptOutcome('FAILED_SYSTEM', null)).toBe('Grading failed')
  })

  it('counts with the right word', () => {
    expect(count(1, 'person', 'people')).toBe('1 person')
    expect(count(1200, 'person', 'people')).toBe('1,200 people')
  })
})
