import { NextResponse } from 'next/server'
import {
  AssessmentError,
  gradePractice,
  practiceBrief,
  practiceRunFor,
} from '@/lib/assessments/service'
import { clientKey, handle, limit, readJson } from '@/lib/assessments/http'
import { newSeed } from '@/lib/assessments/random'
import { STAGES, type Stage } from '@/lib/assessments/types'

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

/**
 * Practice rounds: no account, nothing stored, no AI, no credential. The
 * browser keeps the seed and the work; these routes only compute.
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
        const seed = body.seed === undefined ? newSeed() : seedOf(body.seed)
        const brief = await practiceBrief(slug, seed, stageOf(body.stage ?? 'main'), body.previous)
        return NextResponse.json({ seed, brief })
      }
      case 'run': {
        limit(`practice-run:${key}`, 20)
        const stage = stageOf(body.stage)
        return NextResponse.json(await practiceRunFor(slug, seedOf(body.seed), stage, body.work))
      }
      case 'grade': {
        limit(`practice-grade:${key}`, 6)
        const work = (body.work && typeof body.work === 'object' ? body.work : {}) as Partial<
          Record<Stage, unknown>
        >
        return NextResponse.json(await gradePractice(slug, seedOf(body.seed), work))
      }
      default:
        throw new AssessmentError('Not found', 404)
    }
  })
}
