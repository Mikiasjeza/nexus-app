import { NextResponse } from 'next/server'
import {
  AssessmentError,
  attemptView,
  beginAttempt,
  cancelAttempt,
  fileAppeal,
  recordEvents,
  resultView,
  runAttempt,
  saveDraft,
  settleIfExpired,
  submitStage,
} from '@/lib/assessments/service'
import {
  assessmentDeps,
  handle,
  limit,
  ownedAttempt,
  readJson,
  requireUser,
} from '@/lib/assessments/http'
import { STAGES, type Stage } from '@/lib/assessments/types'

export const dynamic = 'force-dynamic'
// Submitting the last step grades the attempt: sandboxed runs plus one AI call.
export const maxDuration = 60

type Params = { params: Promise<{ id: string; action: string }> }

const stageOf = (value: unknown): Stage => {
  if (typeof value === 'string' && (STAGES as string[]).includes(value)) return value as Stage
  throw new AssessmentError('Unknown step')
}

/** Attempt actions: start, draft, run, events, submit, timeout, cancel, appeal. */
export async function POST(request: Request, { params }: Params) {
  return handle('Attempt action', async () => {
    const userId = await requireUser()
    const { id, action } = await params
    const deps = assessmentDeps()
    let attempt = await ownedAttempt(deps, id, userId)

    switch (action) {
      case 'start': {
        attempt = await beginAttempt(deps, attempt)
        return NextResponse.json(await attemptView(deps, attempt))
      }
      case 'draft': {
        limit(`assess-draft:${userId}`, 60)
        const body = await readJson(request)
        await saveDraft(deps, attempt, stageOf(body.stage), body.work)
        return NextResponse.json({ saved: true, at: new Date().toISOString() })
      }
      case 'run': {
        limit(`assess-run:${userId}`, 20)
        const body = await readJson(request)
        return NextResponse.json(await runAttempt(deps, attempt, body.work))
      }
      case 'events': {
        limit(`assess-events:${userId}`, 30)
        const body = await readJson(request, 20_000)
        const accepted = await recordEvents(deps, attempt, body.events)
        return NextResponse.json({ accepted })
      }
      case 'submit': {
        limit(`assess-submit:${userId}`, 10)
        const body = await readJson(request)
        attempt = await settleIfExpired(deps, attempt)
        if (attempt.status !== 'IN_PROGRESS')
          return NextResponse.json(await attemptView(deps, attempt))
        attempt = await submitStage(deps, attempt, stageOf(body.stage), body.work)
        return NextResponse.json(await attemptView(deps, attempt))
      }
      case 'timeout': {
        // The candidate's clock hit zero: grade what was saved, without the grace wait.
        attempt = await settleIfExpired(deps, attempt, true)
        return NextResponse.json(await attemptView(deps, attempt))
      }
      case 'cancel': {
        attempt = await cancelAttempt(deps, attempt)
        return NextResponse.json({ status: attempt.status })
      }
      case 'appeal': {
        limit(`assess-appeal:${userId}`, 5)
        const body = await readJson(request, 10_000)
        const appeal = await fileAppeal(deps, attempt, userId, String(body.reason ?? ''))
        return NextResponse.json({ id: appeal.id, status: appeal.status })
      }
      default:
        throw new AssessmentError('Not found', 404)
    }
  })
}

/** The result page's data: scores, feedback, credential and appeals. */
export async function GET(_request: Request, { params }: Params) {
  return handle('Attempt result', async () => {
    const userId = await requireUser()
    const { id, action } = await params
    if (action !== 'result') throw new AssessmentError('Not found', 404)
    const deps = assessmentDeps()
    const attempt = await settleIfExpired(deps, await ownedAttempt(deps, id, userId))
    const [evaluation, credential, appeals] = await Promise.all([
      deps.store.latestEvaluation(attempt.id),
      deps.store.credentialForAttempt(attempt.id),
      deps.store.listAppeals({ attemptId: attempt.id }),
    ])
    return NextResponse.json(resultView(attempt, evaluation, credential, appeals, new Date()))
  })
}
