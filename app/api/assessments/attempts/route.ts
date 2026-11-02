import { NextResponse } from 'next/server'
import { createAttempt } from '@/lib/assessments/service'
import { assessmentDeps, handle, limit, readJson, requireUser } from '@/lib/assessments/http'
import type { AssessmentMode } from '@/lib/assessments/types'

export const dynamic = 'force-dynamic'

/** Create an attempt (or return the one already open for that skill). */
export async function POST(request: Request) {
  return handle('Create attempt', async () => {
    const userId = await requireUser()
    limit(`assess-create:${userId}`, 10)
    const body = await readJson(request, 2_000)
    const slug = typeof body.slug === 'string' ? body.slug : ''
    const mode: AssessmentMode = body.mode === 'ai_assisted' ? 'ai_assisted' : 'independent'
    const attempt = await createAttempt(assessmentDeps(), { userId, slug, mode })
    return NextResponse.json({ id: attempt.id, status: attempt.status })
  })
}
