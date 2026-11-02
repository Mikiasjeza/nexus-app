import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAssessment } from '@/lib/assessments/catalog'
import { explainQuestions } from '@/lib/assessments/engine'
import { ANCHORS } from '@/lib/assessments/grading'
import {
  AssessmentError,
  attemptCtx,
  retryEvaluation,
  reviewAttempt,
  revokeCredential,
} from '@/lib/assessments/service'
import { assessmentDeps, handle, readJson, requireReviewer } from '@/lib/assessments/http'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

/** Everything a reviewer needs to decide: the work, the scores and the signals. */
export async function GET(_request: Request, { params }: Params) {
  return handle('Review detail', async () => {
    await requireReviewer()
    const { id } = await params
    const { store } = assessmentDeps()
    const attempt = await store.getAttempt(id)
    if (!attempt) throw new AssessmentError('Attempt not found', 404)
    const def = getAssessment(attempt.slug)
    const [evaluation, events, credential, appeals, user] = await Promise.all([
      store.latestEvaluation(id),
      store.listEvents(id),
      store.credentialForAttempt(id),
      store.listAppeals({ attemptId: id }),
      prisma.user.findUnique({
        where: { id: attempt.userId },
        select: { name: true, email: true },
      }),
    ])
    const counts: Record<string, number> = {}
    for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1
    return NextResponse.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        result: attempt.result,
        score: attempt.score,
        mode: attempt.mode,
        startedAt: attempt.startedAt?.toISOString() ?? null,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        runCount: attempt.runCount,
      },
      candidate: user,
      assessment: def
        ? {
            skillName: def.skillName,
            title: def.title,
            challengeId: attempt.challengeId,
            workspace: def.workspace,
            rubric: def.rubric,
            explainQuestions: explainQuestions(attemptCtx(attempt)),
          }
        : null,
      submissions: Object.fromEntries(
        Object.entries(attempt.submissions).map(([stage, s]) => [
          stage,
          { work: s!.work, hash: s!.hash, submittedAt: s!.submittedAt.toISOString() },
        ])
      ),
      evaluation,
      anchors: ANCHORS,
      events: {
        counts,
        largestPaste: Math.max(
          0,
          ...events.filter((e) => e.type === 'paste').map((e) => Number(e.data.chars) || 0)
        ),
      },
      credential,
      appeals,
    })
  })
}

/** Reviewer actions: review, retry (grading), revoke (credential). */
export async function POST(request: Request, { params }: Params) {
  return handle('Review action', async () => {
    const reviewer = await requireReviewer()
    const { id } = await params
    const deps = assessmentDeps()
    const body = await readJson(request, 20_000)
    const attempt = await deps.store.getAttempt(id)
    if (!attempt) throw new AssessmentError('Attempt not found', 404)

    if (body.action === 'review') {
      const scores: Record<string, number> = {}
      const raw = (body.scores && typeof body.scores === 'object' ? body.scores : {}) as Record<
        string,
        unknown
      >
      for (const [key, value] of Object.entries(raw)) {
        const n = Number(value)
        if (Number.isInteger(n) && n >= 0 && n <= 4) scores[key] = n
      }
      const updated = await reviewAttempt(deps, attempt, reviewer, {
        scores,
        decision: body.decision === 'void' ? 'void' : 'score',
        note: String(body.note ?? ''),
      })
      return NextResponse.json({
        status: updated.status,
        result: updated.result,
        score: updated.score,
      })
    }
    if (body.action === 'retry') {
      const updated = await retryEvaluation(deps, attempt, reviewer)
      return NextResponse.json({ status: updated.status, result: updated.result })
    }
    if (body.action === 'revoke') {
      const credential = await deps.store.credentialForAttempt(id)
      if (!credential) throw new AssessmentError('No credential for this attempt', 404)
      const updated = await revokeCredential(
        deps,
        credential.id,
        reviewer,
        String(body.reason ?? '')
      )
      return NextResponse.json({ status: updated.status })
    }
    throw new AssessmentError('Unknown action')
  })
}
