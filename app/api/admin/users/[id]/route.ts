import { NextResponse } from 'next/server'
import { handle, requireReviewer } from '@/lib/assessments/http'
import { AssessmentError } from '@/lib/assessments/service'
import { userDetail } from '@/lib/admin/users'

export const dynamic = 'force-dynamic'

/** One person's record for the admin area. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('Admin user', async () => {
    await requireReviewer()
    const { id } = await params
    const user = id.length <= 64 ? await userDetail(id) : null
    if (!user) throw new AssessmentError('No account with that id', 404)
    return NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } })
  })
}
