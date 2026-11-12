import { NextResponse } from 'next/server'
import { handle, requireReviewer } from '@/lib/assessments/http'
import { adminOverview } from '@/lib/admin/overview'

export const dynamic = 'force-dynamic'

/** Admin overview: sign-ups, activity, assessments, plans and what needs attention. */
export async function GET() {
  return handle('Admin overview', async () => {
    await requireReviewer()
    return NextResponse.json(await adminOverview(), { headers: { 'Cache-Control': 'no-store' } })
  })
}
