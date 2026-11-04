/**
 * @jest-environment node
 */

import { Prisma } from '@prisma/client'

type Row = Record<string, unknown> & { id: string }

const db: { periods: Row[]; events: Row[] } = { periods: [], events: [] }
let ids = 0
const nextId = (prefix: string) => `${prefix}_${++ids}`

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })
}

/** Applies Prisma-style data: plain values are set, { increment } / { decrement } adjust. */
function apply(target: Row, data: Record<string, unknown>) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      const op = value as { increment?: number; decrement?: number }
      if (op.increment !== undefined) target[key] = Number(target[key] ?? 0) + op.increment
      else if (op.decrement !== undefined) target[key] = Number(target[key] ?? 0) - op.decrement
    } else {
      target[key] = value
    }
  }
}

const matchesCount = (value: number, cond?: { lt?: number; gt?: number }) =>
  !cond ||
  ((cond.lt === undefined || value < cond.lt) && (cond.gt === undefined || value > cond.gt))

const findPeriod = (key: { userId: string; periodStart: Date }) =>
  db.periods.find(
    (p) =>
      p.userId === key.userId && (p.periodStart as Date).getTime() === key.periodStart.getTime()
  )

const mockPrisma: Record<string, unknown> = {
  usageEvent: {
    findUnique: jest.fn(
      async ({ where }: { where: { attemptId: string } }) =>
        db.events.find((e) => e.attemptId === where.attemptId) ?? null
    ),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      if (db.events.some((e) => e.attemptId === data.attemptId)) throw p2002()
      const row: Row = {
        id: nextId('ev'),
        status: 'consumed',
        reason: null,
        releasedAt: null,
        ...data,
      }
      db.events.push(row)
      return row
    }),
    update: jest.fn(
      async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = db.events.find((e) => e.id === where.id)!
        apply(row, data)
        return row
      }
    ),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { attemptId: string; status?: string }
        data: Record<string, unknown>
      }) => {
        const rows = db.events.filter(
          (e) => e.attemptId === where.attemptId && (!where.status || e.status === where.status)
        )
        rows.forEach((row) => apply(row, data))
        return { count: rows.length }
      }
    ),
  },
  usagePeriod: {
    findUnique: jest.fn(
      async ({ where }: { where: { userId_periodStart: { userId: string; periodStart: Date } } }) =>
        findPeriod(where.userId_periodStart) ?? null
    ),
    findMany: jest.fn(
      async ({ where }: { where: { userId: string; periodStart: { gte: Date } } }) =>
        db.periods.filter(
          (p) => p.userId === where.userId && (p.periodStart as Date) >= where.periodStart.gte
        )
    ),
    upsert: jest.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: { userId_periodStart: { userId: string; periodStart: Date } }
        create: Record<string, unknown>
        update: Record<string, unknown>
      }) => {
        const existing = findPeriod(where.userId_periodStart)
        if (existing) {
          apply(existing, update)
          return existing
        }
        const row: Row = {
          id: nextId('up'),
          formalStarted: 0,
          formalUsed: 0,
          practiceRounds: 0,
          ...create,
        }
        db.periods.push(row)
        return row
      }
    ),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string; formalUsed?: { lt?: number; gt?: number } }
        data: Record<string, unknown>
      }) => {
        const row = db.periods.find((p) => p.id === where.id)
        if (!row || !matchesCount(Number(row.formalUsed), where.formalUsed)) return { count: 0 }
        apply(row, data)
        return { count: 1 }
      }
    ),
  },
  // A transaction that rolls back on error, like the real one.
  $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => {
    const snapshot = structuredClone(db)
    try {
      return await fn(mockPrisma)
    } catch (error) {
      db.periods = snapshot.periods
      db.events = snapshot.events
      throw error
    }
  }),
}

// A getter, so the module reads the fake only when it runs a query (jest.mock is hoisted).
jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrisma
  },
}))
jest.mock('@/lib/plan-usage', () => ({ getEffectivePlan: jest.fn(async () => 'free') }))

import { getEffectivePlan } from '@/lib/plan-usage'
import {
  consumeFormalAssessment,
  getAllowanceSummary,
  prismaAllowance,
  recordPracticeRound,
  releaseFormalAssessment,
  usageHistory,
} from '@/lib/billing/usage'
import { AssessmentError } from '@/lib/assessments/errors'

const planOf = getEffectivePlan as jest.Mock
const now = new Date('2026-11-10T09:00:00Z')

beforeEach(() => {
  db.periods = []
  db.events = []
  planOf.mockResolvedValue('free')
})

describe('formal assessment allowance', () => {
  it('uses one when an attempt starts, and only once per attempt', async () => {
    await consumeFormalAssessment('u1', 'att1', now)
    await consumeFormalAssessment('u1', 'att1', now)
    const summary = await getAllowanceSummary('u1', now)
    expect(summary).toMatchObject({
      plan: 'free',
      limit: 1,
      used: 1,
      remaining: 0,
      upgradeTo: 'pro',
    })
    expect(db.events).toHaveLength(1)
    expect(db.periods[0]).toMatchObject({ formalStarted: 1, formalUsed: 1 })
  })

  it('refuses past the limit with a 402 that names the upgrade and reset date', async () => {
    await consumeFormalAssessment('u1', 'att1', now)
    const error = await consumeFormalAssessment('u1', 'att2', now).catch((e) => e)
    expect(error).toBeInstanceOf(AssessmentError)
    expect(error.status).toBe(402)
    expect(error.details).toMatchObject({
      code: 'allowance_exhausted',
      upgradeTo: 'pro',
      resetsAt: '2026-12-01T00:00:00.000Z',
    })
    // The refused attempt left nothing behind.
    expect(db.events.map((e) => e.attemptId)).toEqual(['att1'])
    expect(db.periods[0].formalUsed).toBe(1)
  })

  it('applies the current plan’s limit', async () => {
    planOf.mockResolvedValue('pro')
    for (let i = 1; i <= 5; i++) await consumeFormalAssessment('u1', `att${i}`, now)
    await expect(consumeFormalAssessment('u1', 'att6', now)).rejects.toMatchObject({ status: 402 })
    expect((await getAllowanceSummary('u1', now)).remaining).toBe(0)
  })

  it('gives one back after a system failure, once', async () => {
    await consumeFormalAssessment('u1', 'att1', now)
    await releaseFormalAssessment('att1', 'system_failure', now)
    await releaseFormalAssessment('att1', 'system_failure', now)
    expect((await getAllowanceSummary('u1', now)).used).toBe(0)
    expect(db.events[0]).toMatchObject({ status: 'released', reason: 'system_failure' })
    // The next attempt can start.
    await consumeFormalAssessment('u1', 'att2', now)
    expect((await getAllowanceSummary('u1', now)).used).toBe(1)
  })

  it('counts a retried start once more without counting it as a second start', async () => {
    await consumeFormalAssessment('u1', 'att1', now)
    await releaseFormalAssessment('att1', 'start_failed', now)
    await consumeFormalAssessment('u1', 'att1', now)
    expect(db.periods[0]).toMatchObject({ formalStarted: 1, formalUsed: 1 })
    expect(db.events[0].status).toBe('consumed')
  })

  it('does nothing when releasing an attempt that used none', async () => {
    await releaseFormalAssessment('never-started', 'system_failure', now)
    expect(db.periods).toHaveLength(0)
  })

  it('keeps each month separate', async () => {
    await consumeFormalAssessment('u1', 'att1', now)
    const december = new Date('2026-12-02T09:00:00Z')
    await consumeFormalAssessment('u1', 'att2', december)
    expect((await getAllowanceSummary('u1', december)).used).toBe(1)
  })

  it('checks without using anything', async () => {
    await expect(prismaAllowance.check('u1')).resolves.toBeUndefined()
    expect(db.periods).toHaveLength(0)
  })
})

describe('usage history', () => {
  it('fills months with no activity and counts practice rounds', async () => {
    await recordPracticeRound('u1', now)
    await recordPracticeRound('u1', now)
    await consumeFormalAssessment('u1', 'att1', now)
    const history = await usageHistory('u1', 3, now)
    expect(history.map((m) => m.periodStart.slice(0, 7))).toEqual(['2026-11', '2026-10', '2026-09'])
    expect(history[0]).toMatchObject({ plan: 'free', used: 1, practiceRounds: 2, limit: 1 })
    expect(history[1]).toMatchObject({ plan: null, used: 0, practiceRounds: 0 })
  })
})
