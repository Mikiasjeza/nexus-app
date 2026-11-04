/**
 * The monthly allowance of formal assessments, as the assessment service sees
 * it. The policy:
 *
 * - Starting the timer uses one assessment. Creating an attempt and leaving
 *   before the timer starts uses nothing.
 * - One attempt uses at most one, however often its start is retried.
 * - It is given back if grading fails on our side (FAILED_SYSTEM). Letting
 *   the time run out still counts: the task has been seen.
 *
 * lib/billing/usage.ts stores it in the database; MemoryAllowance is for tests.
 */

import { AssessmentError } from './errors'

export interface AllowanceGate {
  /** Throws if this person has no formal assessments left this month. */
  check(userId: string): Promise<void>
  /**
   * Uses one for this attempt. Idempotent per attempt: resolves true only for
   * the call that actually used one. Throws when none are left.
   */
  consume(userId: string, attemptId: string): Promise<boolean>
  /** Gives it back. Idempotent; does nothing if the attempt used none. */
  release(attemptId: string, reason: string): Promise<void>
}

export const ALLOWANCE_USED_UP = 'allowance_exhausted'

export function allowanceExhausted(limit: number, details: Record<string, unknown> = {}) {
  const plural = limit === 1 ? 'assessment' : 'assessments'
  return new AssessmentError(
    `You've used your ${limit} formal ${plural} for this month. Your allowance resets on the 1st, or you can upgrade for more.`,
    402,
    { code: ALLOWANCE_USED_UP, limit, ...details }
  )
}

/** In-memory allowance with a fixed monthly limit per person. Not shared between servers. */
export class MemoryAllowance implements AllowanceGate {
  used = new Map<string, number>()
  consumed = new Map<string, { userId: string; released: boolean }>()

  constructor(private readonly limitFor: (userId: string) => number = () => 1) {}

  async check(userId: string) {
    const limit = this.limitFor(userId)
    if ((this.used.get(userId) ?? 0) >= limit) throw allowanceExhausted(limit)
  }

  async consume(userId: string, attemptId: string) {
    const prior = this.consumed.get(attemptId)
    if (prior && !prior.released) return false
    const limit = this.limitFor(userId)
    const used = this.used.get(userId) ?? 0
    if (used >= limit) throw allowanceExhausted(limit)
    this.used.set(userId, used + 1)
    this.consumed.set(attemptId, { userId, released: false })
    return true
  }

  async release(attemptId: string) {
    const prior = this.consumed.get(attemptId)
    if (!prior || prior.released) return
    prior.released = true
    this.used.set(prior.userId, Math.max(0, (this.used.get(prior.userId) ?? 1) - 1))
  }
}
