import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAssessment } from '@/lib/assessments/catalog'
import { assessmentDeps, handle, requireReviewer } from '@/lib/assessments/http'
import { judge0Health } from '@/lib/assessments/runners/judge0'
import { devPythonEnabled } from '@/lib/assessments/runners/pyodide-dev'
import { dailyLimit, usedToday } from '@/lib/assessments/budget'
import type { AttemptRecord } from '@/lib/assessments/store'

export const dynamic = 'force-dynamic'

/** Reviewer queue: attempts waiting for a person, failed gradings, open appeals and grading costs. */
export async function GET() {
  return handle('Review queue', async () => {
    await requireReviewer()
    const { store } = assessmentDeps()
    const since = new Date(Date.now() - 30 * 86_400_000)
    const [pending, failed, evaluating, appeals, costs, runner, runsToday] = await Promise.all([
      store.listAttemptsByStatus('PENDING_REVIEW'),
      store.listAttemptsByStatus('FAILED_SYSTEM'),
      store.listAttemptsByStatus('EVALUATING'),
      store.listAppeals({ status: 'OPEN' }),
      store.costSummary(since),
      judge0Health(),
      usedToday(),
    ])
    const userIds = [...new Set([...pending, ...failed, ...evaluating].map((a) => a.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    })
    const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? 'Unknown'
    const row = (a: AttemptRecord) => ({
      id: a.id,
      candidate: nameOf(a.userId),
      skillName: getAssessment(a.slug)?.skillName ?? a.slug,
      mode: a.mode,
      status: a.status,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    })
    // A grading that has run for 5+ minutes was cut off and can be retried.
    const stale = evaluating.filter(
      (a) => a.submittedAt && Date.now() - a.submittedAt.getTime() > 5 * 60_000
    )
    return NextResponse.json({
      // Is code execution up, which languages it will use, and today's spend against the cap.
      runner: {
        ...runner,
        devPython: devPythonEnabled(),
        usage: { today: runsToday, limit: dailyLimit() },
      },
      // What grading costs, so spending can be watched per completed assessment.
      costs: {
        windowDays: 30,
        ...costs,
        averageAiCostUsd: costs.graded ? costs.aiCostUsd / costs.graded : 0,
      },
      pending: pending.map(row),
      failed: [...failed, ...stale].map(row),
      appeals: appeals.map((a) => ({
        id: a.id,
        attemptId: a.attemptId,
        reason: a.reason,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  })
}
