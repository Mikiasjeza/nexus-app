/**
 * @jest-environment node
 */

import { MemoryAssessmentStore } from '@/lib/assessments/store'
import { MemoryAllowance } from '@/lib/assessments/allowance'
import {
  AssessmentError,
  beginAttempt,
  createAttempt,
  practiceCtx,
  resultView,
  submitStage,
  type Deps,
} from '@/lib/assessments/service'
import type { AiGrade, GradingInput } from '@/lib/assessments/ai-grader'
import { getAssessment } from '@/lib/assessments/catalog'
import { solutionJs } from '@/test-utils/assessment-fixtures'

jest.setTimeout(30_000)

const stubGrader = async (input: GradingInput): Promise<AiGrade> => ({
  judgements: Object.fromEntries(
    input.rubric.criteria
      .filter((c) => c.source.startsWith('ai:'))
      .map((c) => [
        c.id,
        {
          score: 0.75,
          evidence: ['quoted line'],
          notes: 'Clear and correct.',
          assessedBy: 'ai' as const,
        },
      ])
  ),
  flags: [],
  model: 'stub',
})

function setup(limit: number, grade: Deps['grade'] = stubGrader) {
  let now = new Date('2026-11-02T10:00:00Z')
  const store = new MemoryAssessmentStore()
  const allowance = new MemoryAllowance(() => limit)
  const deps: Deps = { store, grade, allowance, now: () => now }
  const advance = (minutes: number) => {
    now = new Date(now.getTime() + minutes * 60_000)
  }
  return { store, allowance, deps, advance }
}

async function finish(deps: Deps, advance: (m: number) => void, slug = 'javascript') {
  let attempt = await createAttempt(deps, { userId: 'u1', slug, mode: 'independent' })
  attempt = await beginAttempt(deps, attempt)
  advance(10)
  attempt = await submitStage(deps, attempt, 'main', {
    code: solutionJs(attempt.challengeId, attempt.seed, false),
  })
  advance(5)
  attempt = await submitStage(deps, attempt, 'followup', {
    code: solutionJs(attempt.challengeId, attempt.seed, true),
  })
  advance(5)
  return submitStage(deps, attempt, 'explain', {
    answers: ['It skips bad amounts.', 'I added a seen set.', 'Stream the records.'],
  })
}

describe('monthly allowance in the assessment lifecycle', () => {
  it('uses one when the timer starts, not when the attempt is created', async () => {
    const { deps, allowance } = setup(1)
    const attempt = await createAttempt(deps, {
      userId: 'u1',
      slug: 'javascript',
      mode: 'independent',
    })
    expect(allowance.used.get('u1') ?? 0).toBe(0)
    await beginAttempt(deps, attempt)
    expect(allowance.used.get('u1')).toBe(1)
  })

  it('counts a repeated start of the same attempt once', async () => {
    const { deps, allowance } = setup(5)
    const attempt = await createAttempt(deps, {
      userId: 'u1',
      slug: 'javascript',
      mode: 'independent',
    })
    const started = await beginAttempt(deps, attempt)
    await beginAttempt(deps, started)
    expect(allowance.used.get('u1')).toBe(1)
  })

  it('keeps the winner’s use when two starts race for one attempt', async () => {
    const { deps, allowance } = setup(5)
    const attempt = await createAttempt(deps, {
      userId: 'u1',
      slug: 'javascript',
      mode: 'independent',
    })
    const [first, second] = await Promise.allSettled([
      beginAttempt(deps, attempt),
      beginAttempt(deps, attempt),
    ])
    expect([first.status, second.status].sort()).toEqual(['fulfilled', 'rejected'])
    expect(allowance.used.get('u1')).toBe(1)
  })

  it('stops a new attempt once the month’s allowance is used, with a 402 naming the reason', async () => {
    const { deps, advance } = setup(1)
    await finish(deps, advance)
    const error = await createAttempt(deps, {
      userId: 'u1',
      slug: 'sql',
      mode: 'independent',
    }).catch((e) => e)
    expect(error).toBeInstanceOf(AssessmentError)
    expect(error.status).toBe(402)
    expect(error.details).toMatchObject({ code: 'allowance_exhausted', limit: 1 })
  })

  it('still returns an attempt someone already opened, without checking again', async () => {
    const { deps } = setup(1)
    const opened = await createAttempt(deps, {
      userId: 'u1',
      slug: 'javascript',
      mode: 'independent',
    })
    await beginAttempt(deps, opened)
    const again = await createAttempt(deps, {
      userId: 'u1',
      slug: 'javascript',
      mode: 'independent',
    })
    expect(again.id).toBe(opened.id)
  })

  it('gives the assessment back when grading fails on our side', async () => {
    const failingGrader = async (): Promise<AiGrade> => {
      throw new Error('grader crashed')
    }
    const { deps, advance, allowance } = setup(1, failingGrader)
    const attempt = await finish(deps, advance)
    expect(attempt.status).toBe('FAILED_SYSTEM')
    expect(allowance.used.get('u1')).toBe(0)
  })

  it('works with no allowance configured (local development)', async () => {
    const store = new MemoryAssessmentStore()
    const deps: Deps = { store, grade: stubGrader }
    const attempt = await createAttempt(deps, {
      userId: 'u1',
      slug: 'javascript',
      mode: 'independent',
    })
    await expect(beginAttempt(deps, attempt)).resolves.toMatchObject({ status: 'IN_PROGRESS' })
  })
})

describe('result detail by plan', () => {
  it('shows scores to everyone and the reasons and evidence only with full detail', async () => {
    const { deps, advance, store } = setup(5)
    const attempt = await finish(deps, advance)
    const evaluation = await store.latestEvaluation(attempt.id)
    const credential = await store.credentialForAttempt(attempt.id)
    const now = new Date('2026-11-02T12:00:00Z')

    const basic = resultView(attempt, evaluation, credential, [], now, { detail: 'basic' })
    const full = resultView(attempt, evaluation, credential, [], now, { detail: 'full' })

    expect(basic.score).toBe(full.score)
    expect(basic.credential).toEqual(full.credential)
    expect(basic.criteria.map((c) => c.score)).toEqual(full.criteria.map((c) => c.score))
    expect(basic.criteria.every((c) => c.evidence.length === 0 && c.notes === undefined)).toBe(true)
    expect(basic.detailLocked).toBe(true)
    expect(full.detailLocked).toBe(false)
    expect(full.criteria.some((c) => c.evidence.length > 0)).toBe(true)
  })
})

describe('practice challenge pool by plan', () => {
  it('gives Free one challenge per skill and paid plans the whole pool', () => {
    const def = getAssessment('javascript')!
    const free = new Set(
      Array.from({ length: 30 }, (_, seed) => practiceCtx('javascript', seed, false).challengeId)
    )
    const paid = new Set(
      Array.from({ length: 30 }, (_, seed) => practiceCtx('javascript', seed, true).challengeId)
    )
    expect([...free]).toEqual([def.challengeIds[0]])
    expect(paid.size).toBe(def.challengeIds.length)
  })
})
