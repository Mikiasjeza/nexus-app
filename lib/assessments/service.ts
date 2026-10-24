/**
 * The assessment lifecycle: every rule about who may do what to an attempt,
 * and when, lives here so API routes stay thin. All timing uses the server
 * clock; the browser's timer is only a display.
 */

import { createHash } from 'node:crypto'
import {
  ASSESSMENTS,
  RETAKE_POLICY,
  getAssessment,
  isAvailable,
  totalMinutes,
  type AssessmentDefinition,
} from './catalog'
import { buildBrief, cleanWork, evaluateDeterministic, gradingInput, practiceRun } from './engine'
import { gradeWithAI, type AiGrade, type GradingInput } from './ai-grader'
import {
  anchorShare,
  decide,
  feedbackFor,
  scoreCriteria,
  sourceKind,
  type Judgement,
} from './grading'
import { assertTransition, isPastDeadline, nextStage } from './state'
import { newSeed } from './random'
import type {
  AssessmentMode,
  AttemptStatus,
  CriterionScore,
  EvaluationRecord,
  IntegrityFlag,
  PublicBrief,
  Stage,
  StageWork,
} from './types'
import type {
  AppealRecord,
  AssessmentStore,
  AttemptEventRecord,
  AttemptRecord,
  CredentialRecord,
  StoredEvaluation,
} from './store'

export class AssessmentError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
  }
}

export interface Deps {
  store: AssessmentStore
  /** AI grading; tests pass a stub. Omit to leave judgement criteria for a reviewer. */
  grade?: (input: GradingInput) => Promise<AiGrade>
  now?: () => Date
}

const clock = (deps: Deps) => (deps.now ? deps.now() : new Date())

export const ACTIVE_STATUSES: AttemptStatus[] = ['CREATED', 'READY', 'IN_PROGRESS']
const MAX_RUNS = 300
const MAX_EVENTS = 1000
const LARGE_PASTE_CHARS = 300
const APPEAL_WINDOW_DAYS = 30

function definition(slug: string): AssessmentDefinition {
  const def = getAssessment(slug)
  if (!def) throw new AssessmentError('Assessment not found', 404)
  return def
}

export const contentHash = (work: StageWork) =>
  createHash('sha256').update(JSON.stringify(work)).digest('hex')

function hasContent(work: StageWork | undefined): boolean {
  if (!work) return false
  return Boolean(
    work.code?.trim() ||
    work.text?.trim() ||
    Object.values(work.queries ?? {}).some((q) => q.trim()) ||
    work.answers?.some((a) => a.trim())
  )
}

// ─── Retakes ──────────────────────────────────────────────────────────────

export interface RetakeStatus {
  allowed: boolean
  reason?: string
  nextAt?: Date
}

/** System failures and cancellations don't count against anyone. */
const counts = (a: AttemptRecord) =>
  a.status !== 'CANCELLED' && a.status !== 'FAILED_SYSTEM' && a.result !== 'INCONCLUSIVE'

export function retakeStatus(attempts: AttemptRecord[], now: Date): RetakeStatus {
  const windowStart = now.getTime() - RETAKE_POLICY.windowDays * 86_400_000
  const recent = attempts.filter((a) => counts(a) && a.createdAt.getTime() >= windowStart)
  if (recent.length >= RETAKE_POLICY.maxAttempts) {
    const oldest = Math.min(...recent.map((a) => a.createdAt.getTime()))
    return {
      allowed: false,
      reason: `You've used ${RETAKE_POLICY.maxAttempts} attempts in ${RETAKE_POLICY.windowDays} days.`,
      nextAt: new Date(oldest + RETAKE_POLICY.windowDays * 86_400_000),
    }
  }
  const lastFail = attempts.find((a) => a.result === 'NOT_PASSED' && a.completedAt)
  if (lastFail?.completedAt) {
    const until = lastFail.completedAt.getTime() + RETAKE_POLICY.cooldownHours * 3_600_000
    if (until > now.getTime()) {
      return {
        allowed: false,
        reason: `You can retake ${RETAKE_POLICY.cooldownHours} hours after a result that did not pass.`,
        nextAt: new Date(until),
      }
    }
  }
  return { allowed: true }
}

// ─── Starting ─────────────────────────────────────────────────────────────

/** Create an attempt, or return the one already open for this skill. */
export async function createAttempt(
  deps: Deps,
  input: { userId: string; slug: string; mode: AssessmentMode }
): Promise<AttemptRecord> {
  const def = definition(input.slug)
  if (!isAvailable(def)) throw new AssessmentError('This assessment is not open yet.', 409)
  if (!def.modes.includes(input.mode)) throw new AssessmentError('That mode is not offered here.')
  const attempts = await deps.store.listAttempts(input.userId, def.slug)
  const open = attempts.find((a) => ACTIVE_STATUSES.includes(a.status))
  if (open) return open
  const retake = retakeStatus(attempts, clock(deps))
  if (!retake.allowed) throw new AssessmentError(retake.reason ?? 'Not yet', 429)
  // Content comes from the seed on demand, so an attempt is ready once it exists.
  return deps.store.createAttempt({
    userId: input.userId,
    slug: def.slug,
    challengeId: def.challengeId,
    challengeVersion: def.challengeVersion,
    rubricId: def.rubric.id,
    rubricVersion: def.rubric.version,
    mode: input.mode,
    seed: newSeed(),
    status: 'READY',
  })
}

export async function beginAttempt(deps: Deps, attempt: AttemptRecord): Promise<AttemptRecord> {
  if (attempt.status === 'IN_PROGRESS') return attempt
  assertTransition(attempt.status, 'IN_PROGRESS')
  const def = definition(attempt.slug)
  const now = clock(deps)
  return deps.store.updateAttempt(attempt.id, attempt.status, {
    status: 'IN_PROGRESS',
    startedAt: now,
    deadlineAt: new Date(now.getTime() + totalMinutes(def) * 60_000),
  })
}

export async function cancelAttempt(deps: Deps, attempt: AttemptRecord): Promise<AttemptRecord> {
  if (attempt.status === 'IN_PROGRESS') {
    throw new AssessmentError(
      'A started attempt can’t be cancelled; submit it or let it time out.',
      409
    )
  }
  assertTransition(attempt.status, 'CANCELLED')
  return deps.store.updateAttempt(attempt.id, attempt.status, { status: 'CANCELLED' })
}

// ─── Working ──────────────────────────────────────────────────────────────

function assertWorking(attempt: AttemptRecord, now: Date, stage?: Stage) {
  if (attempt.status !== 'IN_PROGRESS')
    throw new AssessmentError('This attempt is not in progress.', 409)
  if (attempt.deadlineAt && isPastDeadline(attempt.deadlineAt, now)) {
    throw new AssessmentError('Time is up for this attempt.', 409)
  }
  if (stage && stage !== attempt.stage) {
    throw new AssessmentError('That step is already closed. Reload to continue.', 409)
  }
}

/**
 * Past the deadline: lock whatever was saved and grade it. With nothing
 * saved for the main task, the attempt simply expires. `atDeadline` skips
 * the grace period, for when the candidate's own timer has run out.
 */
export async function settleIfExpired(
  deps: Deps,
  attempt: AttemptRecord,
  atDeadline = false
): Promise<AttemptRecord> {
  const now = clock(deps)
  if (attempt.status !== 'IN_PROGRESS' || !attempt.deadlineAt) return attempt
  const over = atDeadline
    ? now.getTime() >= attempt.deadlineAt.getTime()
    : isPastDeadline(attempt.deadlineAt, now)
  if (!over) return attempt
  const def = definition(attempt.slug)
  if (!attempt.submissions.main && !hasContent(attempt.drafts.main)) {
    return deps.store.updateAttempt(attempt.id, 'IN_PROGRESS', {
      status: 'EXPIRED',
      completedAt: now,
    })
  }
  const order: Stage[] = ['main', 'followup', 'explain']
  for (const stage of order.slice(order.indexOf(attempt.stage))) {
    if (attempt.submissions[stage]) continue
    const work = cleanWork(def, stage, attempt.drafts[stage] ?? {})
    await deps.store.saveSubmission(attempt.id, stage, work, contentHash(work))
  }
  await deps.store.addEvents(attempt.id, [
    { type: 'auto-submit', stage: attempt.stage, data: { reason: 'deadline' }, at: now },
  ])
  const submitted = await deps.store.updateAttempt(attempt.id, 'IN_PROGRESS', {
    status: 'SUBMITTED',
    submittedAt: now,
  })
  return evaluateAttempt(deps, submitted)
}

export async function saveDraft(
  deps: Deps,
  attempt: AttemptRecord,
  stage: Stage,
  raw: unknown
): Promise<AttemptRecord> {
  assertWorking(attempt, clock(deps), stage)
  const work = cleanWork(definition(attempt.slug), stage, raw)
  return deps.store.updateAttempt(attempt.id, 'IN_PROGRESS', {
    drafts: { ...attempt.drafts, [stage]: work },
  })
}

const EVENT_TYPES = new Set(['paste', 'hidden', 'visible', 'copy', 'blur'])

/** Integrity signals from the browser. Malformed or unknown events are dropped. */
export async function recordEvents(
  deps: Deps,
  attempt: AttemptRecord,
  raw: unknown
): Promise<number> {
  const now = clock(deps)
  assertWorking(attempt, now)
  const list = Array.isArray(raw) ? raw.slice(0, 50) : []
  const room = MAX_EVENTS - (await deps.store.countEvents(attempt.id))
  if (room <= 0) return 0
  const events: AttemptEventRecord[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const { type, chars } = item as { type?: unknown; chars?: unknown }
    if (typeof type !== 'string' || !EVENT_TYPES.has(type)) continue
    const data: Record<string, unknown> = {}
    if (typeof chars === 'number' && Number.isFinite(chars))
      data.chars = Math.max(0, Math.min(1e6, Math.round(chars)))
    events.push({ type, stage: attempt.stage, data, at: now })
  }
  await deps.store.addEvents(attempt.id, events.slice(0, room))
  return events.length
}

export async function runAttempt(deps: Deps, attempt: AttemptRecord, raw: unknown) {
  assertWorking(attempt, clock(deps))
  if (attempt.stage === 'explain') throw new AssessmentError('Nothing to run in this step.')
  if (attempt.runCount >= MAX_RUNS)
    throw new AssessmentError('Run limit reached for this attempt.', 429)
  const def = definition(attempt.slug)
  const work = cleanWork(def, attempt.stage, raw)
  await deps.store.updateAttempt(attempt.id, 'IN_PROGRESS', {
    runCount: attempt.runCount + 1,
    drafts: { ...attempt.drafts, [attempt.stage]: work },
  })
  return practiceRun(def, attempt.seed, attempt.stage, work)
}

export async function submitStage(
  deps: Deps,
  attempt: AttemptRecord,
  stage: Stage,
  raw: unknown
): Promise<AttemptRecord> {
  assertWorking(attempt, clock(deps), stage)
  const def = definition(attempt.slug)
  const work = cleanWork(def, stage, raw)
  // A retry after a half-finished submit finds the stage already locked.
  if (!attempt.submissions[stage]) {
    await deps.store.saveSubmission(attempt.id, stage, work, contentHash(work))
  }
  const next = nextStage(stage)
  if (next) {
    return deps.store.updateAttempt(attempt.id, 'IN_PROGRESS', {
      stage: next,
      drafts: { ...attempt.drafts, [stage]: work },
    })
  }
  const submitted = await deps.store.updateAttempt(attempt.id, 'IN_PROGRESS', {
    status: 'SUBMITTED',
    submittedAt: clock(deps),
    drafts: { ...attempt.drafts, [stage]: work },
  })
  return evaluateAttempt(deps, submitted)
}

// ─── Grading ──────────────────────────────────────────────────────────────

export function integrityFromEvents(
  mode: AssessmentMode,
  events: AttemptEventRecord[],
  attempt: Pick<AttemptRecord, 'startedAt' | 'submissions'>
): IntegrityFlag[] {
  const flags: IntegrityFlag[] = []
  const pastes = events.filter((e) => e.type === 'paste' && e.stage !== 'explain')
  const largest = Math.max(0, ...pastes.map((e) => Number(e.data.chars) || 0))
  if (largest >= LARGE_PASTE_CHARS) {
    flags.push({
      code: 'large-paste',
      detail: `A single paste of ${largest} characters during the task.`,
      severity: mode === 'independent' ? 'review' : 'info',
    })
  }
  const explainPaste = events.some(
    (e) => e.type === 'paste' && e.stage === 'explain' && Number(e.data.chars) >= 120
  )
  if (explainPaste) {
    flags.push({
      code: 'explain-paste',
      detail: 'Explanation answers were pasted in rather than typed.',
      severity: 'review',
    })
  }
  const hidden = events.filter((e) => e.type === 'hidden').length
  if (hidden >= 10) {
    flags.push({
      code: 'focus',
      detail: `Left the assessment tab ${hidden} times.`,
      severity: 'info',
    })
  }
  const main = attempt.submissions.main
  if (attempt.startedAt && main) {
    const minutes = (main.submittedAt.getTime() - attempt.startedAt.getTime()) / 60_000
    if (minutes < 2) {
      flags.push({
        code: 'fast-main',
        detail: `The main task was submitted ${Math.max(1, Math.round(minutes * 60))} seconds after starting.`,
        severity: 'info',
      })
    }
  }
  return flags
}

const workOf = (attempt: AttemptRecord) =>
  Object.fromEntries(
    Object.entries(attempt.submissions).map(([stage, s]) => [stage, s!.work])
  ) as Partial<Record<Stage, StageWork>>

export async function evaluateAttempt(deps: Deps, attempt: AttemptRecord): Promise<AttemptRecord> {
  assertTransition(attempt.status, 'EVALUATING')
  const def = definition(attempt.slug)
  let current = await deps.store.updateAttempt(attempt.id, attempt.status, { status: 'EVALUATING' })
  try {
    const work = workOf(current)
    const deterministic = await evaluateDeterministic(def, current.seed, work)
    const now = clock(deps)
    if (deterministic.systemError) {
      await deps.store.addEvaluation(current.id, {
        rubricId: def.rubric.id,
        rubricVersion: def.rubric.version,
        criteria: [],
        score: null,
        result: 'INCONCLUSIVE',
        feedback: [
          'We could not grade this attempt because part of our grading system failed. It does not count toward your attempts, and we will grade it again once the problem is fixed.',
        ],
        integrity: [],
        evaluatedAt: now.toISOString(),
        evaluatedBy: 'system',
      })
      return deps.store.updateAttempt(current.id, 'EVALUATING', {
        status: 'FAILED_SYSTEM',
        result: 'INCONCLUSIVE',
      })
    }

    const ai: AiGrade = deps.grade
      ? await deps.grade(gradingInput(def, current.seed, current.mode, work, deterministic))
      : { judgements: {}, flags: [], unavailable: 'AI grading is off.' }
    const events = await deps.store.listEvents(current.id)
    const integrity = [
      ...deterministic.flags,
      ...ai.flags,
      ...integrityFromEvents(current.mode, events, current),
    ]
    const criteria = scoreCriteria(def.rubric, deterministic.scores, ai.judgements)
    const decision = decide(def.rubric, criteria, integrity)
    const feedback = feedbackFor(def.rubric, criteria, decision)
    if (decision.result === 'PENDING_REVIEW') {
      feedback.push(
        'A person will review this attempt before a result is final. That usually takes a few days.'
      )
    }
    const evaluation: StoredEvaluation = {
      rubricId: def.rubric.id,
      rubricVersion: def.rubric.version,
      criteria,
      score: decision.score,
      result: decision.result,
      feedback,
      integrity,
      model: ai.model,
      usage: ai.usage,
      evaluatedAt: now.toISOString(),
      evaluatedBy: 'system',
    }
    await deps.store.addEvaluation(current.id, evaluation)
    const pending = decision.result === 'PENDING_REVIEW'
    current = await deps.store.updateAttempt(current.id, 'EVALUATING', {
      status: pending ? 'PENDING_REVIEW' : 'COMPLETED',
      result: decision.result,
      score: decision.score,
      completedAt: pending ? null : now,
    })
    if (decision.result === 'PASSED' && decision.score !== null) {
      await issueCredential(deps, current, decision.score)
    }
    await deps.store.audit({
      actor: 'system',
      action: 'attempt.evaluated',
      targetType: 'attempt',
      targetId: current.id,
      data: { result: decision.result, score: decision.score, flags: integrity.map((f) => f.code) },
    })
    return current
  } catch (error) {
    console.error('Assessment evaluation failed:', error)
    const latest = await deps.store.getAttempt(attempt.id)
    if (latest?.status === 'EVALUATING') {
      return deps.store.updateAttempt(attempt.id, 'EVALUATING', {
        status: 'FAILED_SYSTEM',
        result: 'INCONCLUSIVE',
      })
    }
    throw error
  }
}

/** Retry grading after a system failure (or a grading run that never finished). */
export async function retryEvaluation(deps: Deps, attempt: AttemptRecord, actor: string) {
  let current = attempt
  if (current.status === 'EVALUATING') {
    current = await deps.store.updateAttempt(current.id, 'EVALUATING', { status: 'FAILED_SYSTEM' })
  }
  if (current.status !== 'FAILED_SYSTEM')
    throw new AssessmentError('Only failed gradings can be retried.', 409)
  await deps.store.audit({
    actor,
    action: 'attempt.retry',
    targetType: 'attempt',
    targetId: current.id,
  })
  return evaluateAttempt(deps, current)
}

// ─── Credentials ──────────────────────────────────────────────────────────

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Public credential id, e.g. NX-7K2M-9QXD-4FTA (60 random bits). */
export function newCredentialId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b) => CROCKFORD[b % 32]).join('')
  return `NX-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

async function issueCredential(deps: Deps, attempt: AttemptRecord, score: number) {
  if (await deps.store.credentialForAttempt(attempt.id)) return
  const def = definition(attempt.slug)
  const now = clock(deps)
  for (const old of await deps.store.listCredentials(attempt.userId)) {
    if (old.slug === attempt.slug && old.status === 'ACTIVE') {
      await deps.store.updateCredential(old.id, { status: 'SUPERSEDED' })
    }
  }
  const credential = await deps.store.createCredential({
    id: newCredentialId(),
    userId: attempt.userId,
    attemptId: attempt.id,
    slug: def.slug,
    skillName: def.skillName,
    level: def.level,
    mode: attempt.mode,
    identityLevel: 'A_SELF_ASSERTED',
    score,
    rubricId: attempt.rubricId,
    rubricVersion: attempt.rubricVersion,
    challengeId: attempt.challengeId,
    challengeVersion: attempt.challengeVersion,
    status: 'ACTIVE',
    issuedAt: now,
    expiresAt: addMonths(now, def.credentialValidMonths),
  })
  await deps.store.audit({
    actor: 'system',
    action: 'credential.issued',
    targetType: 'credential',
    targetId: credential.id,
    data: { attemptId: attempt.id, score },
  })
}

/** ACTIVE, or EXPIRED once past its date; revoked and superseded stay as they are. */
export function effectiveStatus(credential: CredentialRecord, now: Date) {
  if (credential.status === 'ACTIVE' && credential.expiresAt.getTime() < now.getTime())
    return 'EXPIRED'
  return credential.status
}

export async function revokeCredential(deps: Deps, id: string, actor: string, reason: string) {
  const credential = await deps.store.getCredential(id)
  if (!credential) throw new AssessmentError('Credential not found', 404)
  if (credential.status === 'REVOKED') return credential
  if (reason.trim().length < 10)
    throw new AssessmentError('Give a reason of at least 10 characters.')
  const updated = await deps.store.updateCredential(id, {
    status: 'REVOKED',
    revokedAt: clock(deps),
    revokedReason: reason.trim().slice(0, 500),
  })
  await deps.store.audit({
    actor,
    action: 'credential.revoked',
    targetType: 'credential',
    targetId: id,
    data: { reason },
  })
  return updated
}

// ─── Review and appeals ───────────────────────────────────────────────────

export interface ReviewInput {
  /** 0–4 anchors for judgement criteria, by criterion id. */
  scores: Record<string, number>
  /** `void`: the reviewer could not accept the work as the candidate's own. */
  decision: 'score' | 'void'
  note: string
}

export async function reviewAttempt(
  deps: Deps,
  attempt: AttemptRecord,
  reviewer: string,
  input: ReviewInput
): Promise<AttemptRecord> {
  if (attempt.status !== 'PENDING_REVIEW')
    throw new AssessmentError('This attempt is not waiting for review.', 409)
  const def = definition(attempt.slug)
  const previous = await deps.store.latestEvaluation(attempt.id)
  if (!previous) throw new AssessmentError('No evaluation to review.', 409)
  const note = input.note.trim().slice(0, 1000)
  if (input.decision === 'void' && note.length < 20) {
    throw new AssessmentError('Explain the decision to the candidate (at least 20 characters).')
  }

  const judgements: Record<string, Judgement> = {}
  for (const criterion of def.rubric.criteria) {
    if (sourceKind(criterion.source) !== 'judgement') continue
    const given = input.scores[criterion.id]
    const before = previous.criteria.find((c) => c.id === criterion.id)
    if (typeof given === 'number' && given >= 0 && given <= 4) {
      judgements[criterion.id] = {
        score: anchorShare(given),
        evidence: before?.evidence ?? [],
        notes: before?.notes,
        assessedBy: 'human',
      }
    } else if (before && before.score !== null) {
      judgements[criterion.id] = {
        score: before.score,
        evidence: before.evidence,
        notes: before.notes,
        assessedBy: before.assessedBy === 'human' ? 'human' : 'ai',
      }
    } else if (input.decision === 'score') {
      throw new AssessmentError(`Score “${criterion.label}” before finishing the review.`)
    }
  }

  // Deterministic scores carry over unchanged; reviewers can't alter them.
  const deterministic: Parameters<typeof scoreCriteria>[1] = {}
  for (const criterion of def.rubric.criteria) {
    if (sourceKind(criterion.source) !== 'deterministic') continue
    const before = previous.criteria.find((c) => c.id === criterion.id)
    deterministic[criterion.source] = {
      score: before?.score ?? 0,
      evidence: before?.evidence ?? [],
      assessedBy: before?.assessedBy === 'checks' ? 'checks' : 'tests',
    }
  }
  const criteria: CriterionScore[] = scoreCriteria(def.rubric, deterministic, judgements)
  // The reviewer has seen the integrity flags; they no longer hold the result.
  const reviewed = previous.integrity.map((f) => ({ ...f, severity: 'info' as const }))
  const decision = decide(def.rubric, criteria, reviewed)
  const result = input.decision === 'void' ? 'NOT_PASSED' : decision.result
  const feedback = feedbackFor(def.rubric, criteria, decision)
  if (note) feedback.unshift(`Reviewer: ${note}`)
  const now = clock(deps)
  await deps.store.addEvaluation(attempt.id, {
    rubricId: def.rubric.id,
    rubricVersion: def.rubric.version,
    criteria,
    score: decision.score,
    result,
    feedback,
    integrity: previous.integrity,
    model: previous.model,
    evaluatedAt: now.toISOString(),
    evaluatedBy: reviewer,
  })
  const updated = await deps.store.updateAttempt(attempt.id, 'PENDING_REVIEW', {
    status: 'COMPLETED',
    result,
    score: decision.score,
    completedAt: now,
  })
  if (result === 'PASSED' && decision.score !== null)
    await issueCredential(deps, updated, decision.score)
  await deps.store.audit({
    actor: reviewer,
    action: 'attempt.reviewed',
    targetType: 'attempt',
    targetId: attempt.id,
    data: { result, score: decision.score, decision: input.decision },
  })
  return updated
}

export async function fileAppeal(
  deps: Deps,
  attempt: AttemptRecord,
  userId: string,
  reason: string
): Promise<AppealRecord> {
  if (attempt.userId !== userId) throw new AssessmentError('Attempt not found', 404)
  if (attempt.status !== 'COMPLETED' || attempt.result !== 'NOT_PASSED') {
    throw new AssessmentError('Only a result that did not pass can be appealed.', 409)
  }
  const now = clock(deps)
  const finished = attempt.completedAt?.getTime() ?? 0
  if (now.getTime() - finished > APPEAL_WINDOW_DAYS * 86_400_000) {
    throw new AssessmentError(`Appeals close ${APPEAL_WINDOW_DAYS} days after the result.`, 409)
  }
  const text = reason.trim()
  if (text.length < 20)
    throw new AssessmentError('Tell us what you think went wrong (at least 20 characters).')
  const existing = await deps.store.listAppeals({ attemptId: attempt.id })
  if (existing.some((a) => a.status === 'OPEN'))
    throw new AssessmentError('An appeal is already open.', 409)
  if (existing.length >= 2)
    throw new AssessmentError('This attempt has already been appealed twice.', 409)
  const appeal = await deps.store.createAppeal({
    attemptId: attempt.id,
    userId,
    reason: text.slice(0, 2000),
  })
  await deps.store.audit({
    actor: userId,
    action: 'appeal.filed',
    targetType: 'attempt',
    targetId: attempt.id,
  })
  return appeal
}

export async function resolveAppeal(
  deps: Deps,
  appealId: string,
  reviewer: string,
  input: { outcome: 'UPHELD' | 'REJECTED'; resolution: string }
): Promise<AppealRecord> {
  const appeal = await deps.store.getAppeal(appealId)
  if (!appeal) throw new AssessmentError('Appeal not found', 404)
  if (appeal.status !== 'OPEN') throw new AssessmentError('This appeal is already resolved.', 409)
  const resolution = input.resolution.trim()
  if (resolution.length < 20)
    throw new AssessmentError('Explain the outcome (at least 20 characters).')
  if (input.outcome === 'UPHELD') {
    const attempt = await deps.store.getAttempt(appeal.attemptId)
    if (!attempt) throw new AssessmentError('Attempt not found', 404)
    assertTransition(attempt.status, 'PENDING_REVIEW')
    await deps.store.updateAttempt(attempt.id, attempt.status, {
      status: 'PENDING_REVIEW',
      completedAt: null,
    })
  }
  const updated = await deps.store.updateAppeal(appealId, {
    status: input.outcome,
    resolution: resolution.slice(0, 2000),
    resolvedBy: reviewer,
    resolvedAt: clock(deps),
  })
  await deps.store.audit({
    actor: reviewer,
    action: `appeal.${input.outcome.toLowerCase()}`,
    targetType: 'attempt',
    targetId: appeal.attemptId,
  })
  return updated
}

// ─── Views for the browser ────────────────────────────────────────────────

export interface AttemptView {
  id: string
  slug: string
  skillName: string
  title: string
  mode: AssessmentMode
  status: AttemptStatus
  stage: Stage
  result: AttemptRecord['result']
  score: number | null
  startedAt: string | null
  deadlineAt: string | null
  serverNow: string
  stageMinutes: AssessmentDefinition['stageMinutes']
  brief: PublicBrief | null
  draft: StageWork | null
}

export async function attemptView(deps: Deps, attempt: AttemptRecord): Promise<AttemptView> {
  const def = definition(attempt.slug)
  const order: Stage[] = ['main', 'followup', 'explain']
  const previousStage = order[order.indexOf(attempt.stage) - 1]
  const brief =
    attempt.status === 'IN_PROGRESS'
      ? await buildBrief(
          def,
          attempt.seed,
          attempt.stage,
          previousStage ? attempt.submissions[previousStage]?.work : undefined
        )
      : null
  return {
    id: attempt.id,
    slug: def.slug,
    skillName: def.skillName,
    title: def.title,
    mode: attempt.mode,
    status: attempt.status,
    stage: attempt.stage,
    result: attempt.result,
    score: attempt.score,
    startedAt: attempt.startedAt?.toISOString() ?? null,
    deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
    serverNow: clock(deps).toISOString(),
    stageMinutes: def.stageMinutes,
    brief,
    draft: attempt.status === 'IN_PROGRESS' ? (attempt.drafts[attempt.stage] ?? null) : null,
  }
}

/** What the candidate sees about their result. Integrity detail stays with reviewers. */
export function resultView(
  attempt: AttemptRecord,
  evaluation: EvaluationRecord | null,
  credential: CredentialRecord | null,
  appeals: AppealRecord[],
  now: Date
) {
  const def = definition(attempt.slug)
  return {
    id: attempt.id,
    slug: def.slug,
    skillName: def.skillName,
    title: def.title,
    level: def.level,
    mode: attempt.mode,
    status: attempt.status,
    result: attempt.result,
    score: attempt.score,
    passThreshold: Math.round(def.rubric.passThreshold * 100),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    rubric: { id: def.rubric.id, version: def.rubric.version },
    criteria:
      evaluation?.criteria.map((c) => ({
        id: c.id,
        label: c.label,
        weight: c.weight,
        score: c.score,
        evidence: c.evidence,
        notes: c.notes,
        assessedBy: c.assessedBy,
      })) ?? [],
    feedback: evaluation?.feedback ?? [],
    underReview: attempt.status === 'PENDING_REVIEW',
    credential: credential
      ? {
          id: credential.id,
          status: effectiveStatus(credential, now),
          expiresAt: credential.expiresAt.toISOString(),
        }
      : null,
    appeals: appeals.map((a) => ({
      id: a.id,
      status: a.status,
      resolution: a.resolution,
      createdAt: a.createdAt.toISOString(),
    })),
  }
}

export type ResultView = ReturnType<typeof resultView>

// ─── Practice (no account, nothing stored) ───────────────────────────────

/**
 * Grades a practice round with the deterministic checks only. No AI, no
 * credential, nothing stored: the browser holds the work and the seed.
 */
export async function gradePractice(
  slug: string,
  seed: number,
  raw: Partial<Record<Stage, unknown>>
) {
  const def = definition(slug)
  if (!isAvailable(def)) throw new AssessmentError('This assessment is not open yet.', 409)
  const work = Object.fromEntries(
    (['main', 'followup', 'explain'] as Stage[]).map((s) => [s, cleanWork(def, s, raw[s] ?? {})])
  ) as Record<Stage, StageWork>
  const deterministic = await evaluateDeterministic(def, seed, work)
  if (deterministic.systemError) throw new AssessmentError(deterministic.systemError, 503)
  const criteria = scoreCriteria(def.rubric, deterministic.scores, {})
  const measured = criteria.filter((c) => c.score !== null)
  const weight = measured.reduce((sum, c) => sum + c.weight, 0)
  const share = weight
    ? measured.reduce((sum, c) => sum + c.weight * (c.score ?? 0), 0) / weight
    : 0
  return {
    slug: def.slug,
    skillName: def.skillName,
    title: def.title,
    criteria,
    /** Share of the automatically checked part only. */
    checkedScore: Math.round(share * 100),
    gates: def.rubric.gates.map((g) => {
      const c = criteria.find((x) => x.id === g.criterionId)!
      return {
        label: c.label,
        minimum: Math.round(g.minimum * 100),
        met: c.score !== null && c.score >= g.minimum,
      }
    }),
  }
}

export async function practiceBrief(slug: string, seed: number, stage: Stage, previous: unknown) {
  const def = definition(slug)
  if (!isAvailable(def)) throw new AssessmentError('This assessment is not open yet.', 409)
  const order: Stage[] = ['main', 'followup', 'explain']
  const prevStage = order[order.indexOf(stage) - 1]
  return buildBrief(def, seed, stage, prevStage ? cleanWork(def, prevStage, previous) : undefined)
}

export async function practiceRunFor(slug: string, seed: number, stage: Stage, raw: unknown) {
  const def = definition(slug)
  if (!isAvailable(def)) throw new AssessmentError('This assessment is not open yet.', 409)
  if (stage === 'explain') throw new AssessmentError('Nothing to run in this step.')
  return practiceRun(def, seed, stage, cleanWork(def, stage, raw))
}

export const CATALOG = ASSESSMENTS

export { gradeWithAI }
