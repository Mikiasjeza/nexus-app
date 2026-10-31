import { NextResponse } from 'next/server'
import { resolveAppeal } from '@/lib/assessments/service'
import { assessmentDeps, handle, readJson, requireReviewer } from '@/lib/assessments/http'

export const dynamic = 'force-dynamic'

/** Resolve an appeal. Upholding it sends the attempt back to the review queue. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('Resolve appeal', async () => {
    const reviewer = await requireReviewer()
    const { id } = await params
    const body = await readJson(request, 10_000)
    const appeal = await resolveAppeal(assessmentDeps(), id, reviewer, {
      outcome: body.outcome === 'UPHELD' ? 'UPHELD' : 'REJECTED',
      resolution: String(body.resolution ?? ''),
    })
    return NextResponse.json({ id: appeal.id, status: appeal.status })
  })
}
