/**
 * A daily cap on calls to the external code runner (Judge0), so a busy day
 * or abuse can't run up a bill. Runs while working stop at the cap; final
 * grading has a reserve on top, so submitted attempts still get graded.
 * JUDGE0_DAILY_LIMIT sets the cap (default 1,000 calls per UTC day).
 */

import { prisma } from '@/lib/db'
import { env } from '@/lib/config/env'

const DEFAULT_DAILY_LIMIT = 1000
/** Extra share of the cap that only final grading may use. */
const GRADING_RESERVE = 0.2

export type RunnerPurpose = 'run' | 'grade'

export function dailyLimit(): number {
  const n = Number(process.env.JUDGE0_DAILY_LIMIT)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_LIMIT
}

const capFor = (purpose: RunnerPurpose) =>
  purpose === 'grade' ? Math.ceil(dailyLimit() * (1 + GRADING_RESERVE)) : dailyLimit()

const today = () => new Date().toISOString().slice(0, 10)

// Local development and tests never write to the database.
const memory = new Map<string, number>()
const inMemory = () => env.isGuestMode || process.env.NODE_ENV === 'test'

export async function usedToday(): Promise<number> {
  const day = today()
  if (inMemory()) return memory.get(day) ?? 0
  const row = await prisma.runnerUsage.findUnique({ where: { day } })
  return row?.calls ?? 0
}

/**
 * Count one runner call if the cap allows it. Refused calls are not counted,
 * so refused practice runs can't eat into the grading reserve.
 */
export async function takeRunnerBudget(purpose: RunnerPurpose): Promise<boolean> {
  const day = today()
  if ((await usedToday()) >= capFor(purpose)) return false
  if (inMemory()) {
    memory.set(day, (memory.get(day) ?? 0) + 1)
    return true
  }
  await prisma.runnerUsage.upsert({
    where: { day },
    create: { day, calls: 1 },
    update: { calls: { increment: 1 } },
  })
  return true
}

export const BUDGET_MESSAGE =
  "Today's code-run allowance is used up. Your work is saved; try again later."
