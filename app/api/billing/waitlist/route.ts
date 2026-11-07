/**
 * POST /api/billing/waitlist
 * Body: { plan: 'career_plus' | 'business', companyName? }
 *
 * Asks to hear when a plan that is not on sale yet opens. Joining twice is
 * harmless; nothing is charged or reserved.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { billingErrorResponse } from '@/lib/billing/http'
import { PLAN_INFO } from '@/lib/plans'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  plan: z.enum(['career_plus', 'business']),
  companyName: z.string().trim().max(120).optional(),
})

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json(
        { error: 'Create an account to join the waitlist.', code: 'guest' },
        { status: 401 }
      )
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const rl = rateLimit(`billing:waitlist:${userId}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { plan, companyName } = bodySchema.parse(await request.json().catch(() => ({})))
    if (PLAN_INFO[plan].availability === 'available') {
      return NextResponse.json(
        { error: `${PLAN_INFO[plan].name} is already available.`, code: 'available' },
        { status: 409 }
      )
    }
    await prisma.waitlistEntry.upsert({
      where: { plan_userId: { plan, userId } },
      create: { plan, userId, companyName: companyName || null },
      update: companyName ? { companyName } : {},
    })
    return NextResponse.json({ joined: true, plan })
  } catch (e) {
    return billingErrorResponse('api/billing/waitlist', e)
  }
}
