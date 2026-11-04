/**
 * Monthly usage in the database: the formal-assessment allowance (policy in
 * lib/assessments/allowance.ts), practice rounds, and history for the
 * dashboard. Limits come from the plan in force when the allowance is used.
 *
 * Race safety: the allowance is taken with a conditional increment
 * (formalUsed < limit) inside a transaction, and UsageEvent.attemptId is
 * unique, so concurrent starts can neither exceed the limit nor count one
 * attempt twice.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  PLAN_INFO,
  nextPlanForAssessments,
  normalizePlan,
  type SubscriptionPlan,
} from '@/lib/plans'
import { getEffectivePlan } from '@/lib/plan-usage'
import { allowanceExhausted, type AllowanceGate } from '@/lib/assessments/allowance'
import { recentWindows, usageWindow } from './period'

export interface AllowanceSummary {
  plan: SubscriptionPlan
  limit: number
  used: number
  remaining: number
  /** When this month's allowance started and when it resets (ISO). */
  periodStart: string
  resetsAt: string
  /** The cheapest plan with a bigger allowance, for the upgrade prompt. */
  upgradeTo: SubscriptionPlan | null
}

function summarize(plan: SubscriptionPlan, used: number, now: Date): AllowanceSummary {
  const limit = PLAN_INFO[plan].limits.formalAssessments
  const window = usageWindow(now)
  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    periodStart: window.start.toISOString(),
    resetsAt: window.end.toISOString(),
    upgradeTo: nextPlanForAssessments(plan),
  }
}

export async function getAllowanceSummary(
  userId: string,
  now: Date = new Date()
): Promise<AllowanceSummary> {
  const [plan, period] = await Promise.all([
    getEffectivePlan(userId, now),
    prisma.usagePeriod.findUnique({
      where: { userId_periodStart: { userId, periodStart: usageWindow(now).start } },
      select: { formalUsed: true },
    }),
  ])
  return summarize(plan, period?.formalUsed ?? 0, now)
}

/** A concurrent first write of the month's row can lose a unique race; one retry wins it. */
async function retryOnUniqueRace<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return run()
    }
    throw error
  }
}

/** Resolves true when this call used one, false when the attempt had already used one. */
export async function consumeFormalAssessment(
  userId: string,
  attemptId: string,
  now: Date = new Date()
): Promise<boolean> {
  const plan = await getEffectivePlan(userId, now)
  const limit = PLAN_INFO[plan].limits.formalAssessments
  const window = usageWindow(now)

  return retryOnUniqueRace(() =>
    prisma.$transaction(async (tx) => {
      const prior = await tx.usageEvent.findUnique({ where: { attemptId } })
      if (prior?.status === 'consumed') return false

      const period = await tx.usagePeriod.upsert({
        where: { userId_periodStart: { userId, periodStart: window.start } },
        create: {
          userId,
          periodStart: window.start,
          periodEnd: window.end,
          plan,
          formalLimit: limit,
        },
        update: { plan, formalLimit: limit },
        select: { id: true, formalUsed: true },
      })

      const taken = await tx.usagePeriod.updateMany({
        where: { id: period.id, formalUsed: { lt: limit } },
        data: prior
          ? { formalUsed: { increment: 1 } }
          : { formalUsed: { increment: 1 }, formalStarted: { increment: 1 } },
      })
      if (taken.count === 0) {
        throw allowanceExhausted(limit, {
          plan,
          upgradeTo: nextPlanForAssessments(plan),
          resetsAt: window.end.toISOString(),
        })
      }

      if (prior) {
        await tx.usageEvent.update({
          where: { id: prior.id },
          data: { status: 'consumed', usagePeriodId: period.id, reason: null, releasedAt: null },
        })
      } else {
        await tx.usageEvent.create({
          data: { usagePeriodId: period.id, userId, kind: 'formal_assessment', attemptId },
        })
      }
      return true
    })
  )
}

/** Gives back the assessment an attempt used, to the month it was taken from. */
export async function releaseFormalAssessment(
  attemptId: string,
  reason: string,
  now: Date = new Date()
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const released = await tx.usageEvent.updateMany({
      where: { attemptId, status: 'consumed' },
      data: { status: 'released', reason: reason.slice(0, 100), releasedAt: now },
    })
    if (released.count === 0) return
    const event = await tx.usageEvent.findUnique({
      where: { attemptId },
      select: { usagePeriodId: true },
    })
    if (!event) return
    await tx.usagePeriod.updateMany({
      where: { id: event.usagePeriodId, formalUsed: { gt: 0 } },
      data: { formalUsed: { decrement: 1 } },
    })
  })
}

/** Counts a practice round for the dashboard. Practice is never blocked by this. */
export async function recordPracticeRound(userId: string, now: Date = new Date()): Promise<void> {
  const plan = await getEffectivePlan(userId, now)
  const window = usageWindow(now)
  await retryOnUniqueRace(() =>
    prisma.usagePeriod.upsert({
      where: { userId_periodStart: { userId, periodStart: window.start } },
      create: {
        userId,
        periodStart: window.start,
        periodEnd: window.end,
        plan,
        formalLimit: PLAN_INFO[plan].limits.formalAssessments,
        practiceRounds: 1,
      },
      update: { practiceRounds: { increment: 1 } },
    })
  )
}

export interface UsageMonth {
  periodStart: string
  plan: SubscriptionPlan | null
  limit: number | null
  used: number
  practiceRounds: number
}

/** This month and the months before it, newest first. Months with no row read as zero. */
export async function usageHistory(
  userId: string,
  months = 6,
  now: Date = new Date()
): Promise<UsageMonth[]> {
  const windows = recentWindows(months, now)
  const rows = await prisma.usagePeriod.findMany({
    where: { userId, periodStart: { gte: windows[windows.length - 1].start } },
    select: {
      periodStart: true,
      plan: true,
      formalLimit: true,
      formalUsed: true,
      practiceRounds: true,
    },
  })
  return windows.map((window) => {
    const row = rows.find((r) => r.periodStart.getTime() === window.start.getTime())
    return {
      periodStart: window.start.toISOString(),
      plan: row ? normalizePlan(row.plan) : null,
      limit: row?.formalLimit ?? null,
      used: row?.formalUsed ?? 0,
      practiceRounds: row?.practiceRounds ?? 0,
    }
  })
}

/** The database-backed allowance the assessment routes use. */
export const prismaAllowance: AllowanceGate = {
  async check(userId) {
    const summary = await getAllowanceSummary(userId)
    if (summary.remaining <= 0) {
      throw allowanceExhausted(summary.limit, {
        plan: summary.plan,
        upgradeTo: summary.upgradeTo,
        resetsAt: summary.resetsAt,
      })
    }
  },
  consume: (userId, attemptId) => consumeFormalAssessment(userId, attemptId),
  release: (attemptId, reason) => releaseFormalAssessment(attemptId, reason),
}
