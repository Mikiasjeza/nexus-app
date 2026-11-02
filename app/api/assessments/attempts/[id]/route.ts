import { NextResponse } from 'next/server'
import { attemptView, settleIfExpired } from '@/lib/assessments/service'
import { assessmentDeps, handle, ownedAttempt, requireUser } from '@/lib/assessments/http'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** The attempt as the workspace needs it. Grades it first if its time ran out. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('Load attempt', async () => {
    const userId = await requireUser()
    const { id } = await params
    const deps = assessmentDeps()
    const attempt = await settleIfExpired(deps, await ownedAttempt(deps, id, userId))
    return NextResponse.json(await attemptView(deps, attempt))
  })
}
