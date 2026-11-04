import { NextResponse } from 'next/server'
import {
  AssessmentError,
  gradePractice,
  practiceBrief,
  practiceRunFor,
  type PracticeOptions,
} from '@/lib/assessments/service'
import { clientKey, guardMeteredPractice, handle, limit, readJson } from '@/lib/assessments/http'
import { newSeed } from '@/lib/assessments/random'
import { STAGES, type Stage } from '@/lib/assessments/types'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { canUseAllPracticeChallenges } from '@/lib/billing/entitlements'
import { recordPracticeRound } from '@/lib/billing/usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const stageOf = (value: unknown): Stage => {
  if (typeof value === 'string' && (STAGES as string[]).includes(value)) return value as Stage
  throw new AssessmentError('Unknown step')
}

const seedOf = (value: unknown): number => {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 0x7fffffff)
    throw new AssessmentError('Invalid practice round')
  return n
}

/** Guests and Free accounts practise each skill's first challenge; paid plans practise them all. */
async function practiceAccess(): Promise<{ userId: string | null; options: PracticeOptions }> {
  const userId = (await isGuestRequest()) ? null : await getSessionUserId()
  return { userId, options: { allChallenges: await canUseAllPracticeChallenges(userId) } }
}

/**
 * Practice rounds: nothing stored, no AI, no credential. The browser keeps
 * the seed and the work; these routes only compute. No account is needed,
 * except to run code on the metered external runner (Judge0).
 */
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  return handle('Practice round', async () => {
    const { action } = await params
    const key = clientKey(request)
    const body = await readJson(request)
    const slug = String(body.slug ?? '')

    switch (action) {
      case 'brief': {
        limit(`practice-brief:${key}`, 30)
        const { userId, options } = await practiceAccess()
        const fresh = body.seed === undefined
        const seed = fresh ? newSeed() : seedOf(body.seed)
        const stage = stageOf(body.stage ?? 'main')
        const brief = await practiceBrief(slug, seed, stage, body.previous, options)
        // Count new rounds for the usage dashboard; practice is never blocked by it.
        if (fresh && stage === 'main' && userId) {
          await recordPracticeRound(userId).catch((error) =>
            console.error('Practice usage not recorded:', error)
          )
        }
        return NextResponse.json({ seed, brief, allChallenges: options.allChallenges })
      }
      case 'run': {
        limit(`practice-run:${key}`, 20)
        await guardMeteredPractice(slug, 10)
        const stage = stageOf(body.stage)
        const { options } = await practiceAccess()
        return NextResponse.json(
          await practiceRunFor(slug, seedOf(body.seed), stage, body.work, options)
        )
      }
      case 'grade': {
        limit(`practice-grade:${key}`, 6)
        await guardMeteredPractice(slug, 3)
        const work = (body.work && typeof body.work === 'object' ? body.work : {}) as Partial<
          Record<Stage, unknown>
        >
        const { options } = await practiceAccess()
        return NextResponse.json(await gradePractice(slug, seedOf(body.seed), work, options))
      }
      default:
        throw new AssessmentError('Not found', 404)
    }
  })
}
