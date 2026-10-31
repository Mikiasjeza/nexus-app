/**
 * Attempt lifecycle as an explicit state machine, so no route can jump an
 * attempt to a state it may not reach (for example straight to COMPLETED).
 *
 * CREATED → READY → IN_PROGRESS → SUBMITTED → EVALUATING → (PENDING_REVIEW →) COMPLETED
 * with CANCELLED, EXPIRED and FAILED_SYSTEM as controlled exits, and an upheld
 * appeal reopening COMPLETED for review.
 */

import type { AttemptStatus, Stage } from './types'
import { STAGES } from './types'

const TRANSITIONS: Record<AttemptStatus, AttemptStatus[]> = {
  CREATED: ['READY', 'CANCELLED'],
  READY: ['IN_PROGRESS', 'CANCELLED', 'EXPIRED'],
  IN_PROGRESS: ['SUBMITTED', 'CANCELLED', 'EXPIRED'],
  SUBMITTED: ['EVALUATING'],
  EVALUATING: ['COMPLETED', 'PENDING_REVIEW', 'FAILED_SYSTEM'],
  PENDING_REVIEW: ['COMPLETED'],
  // A system failure can be retried once the cause is fixed.
  FAILED_SYSTEM: ['EVALUATING'],
  // An upheld appeal sends a finished attempt back to a reviewer.
  COMPLETED: ['PENDING_REVIEW'],
  CANCELLED: [],
  EXPIRED: [],
}

export function canTransition(from: AttemptStatus, to: AttemptStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export class TransitionError extends Error {
  constructor(
    public readonly from: AttemptStatus,
    public readonly to: AttemptStatus
  ) {
    super(`An attempt can't move from ${from} to ${to}`)
  }
}

export function assertTransition(from: AttemptStatus, to: AttemptStatus): void {
  if (!canTransition(from, to)) throw new TransitionError(from, to)
}

export function nextStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage)
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null
}

/** Small allowance for network lag on the final save; the clock is the server's. */
export const DEADLINE_GRACE_MS = 2 * 60_000

export function isPastDeadline(deadlineAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > deadlineAt.getTime() + DEADLINE_GRACE_MS
}
