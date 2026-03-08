import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/session'
import { stripeService } from '@/lib/integrations/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const requestOrigin = new URL(request.url).origin
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || requestOrigin}/settings`
    const url = await stripeService.createBillingPortalSession(userId, returnUrl)
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Billing portal failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 400 }
    )
  }
}
