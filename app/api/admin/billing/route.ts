import { NextResponse } from 'next/server'
import { handle, requireReviewer } from '@/lib/assessments/http'
import { billingOverview } from '@/lib/billing/admin'

export const dynamic = 'force-dynamic'

/** Admin billing overview: plans on sale, subscribers, promotions, usage, AI spend, webhooks. */
export async function GET() {
  return handle('Billing overview', async () => {
    await requireReviewer()
    return NextResponse.json(await billingOverview())
  })
}
