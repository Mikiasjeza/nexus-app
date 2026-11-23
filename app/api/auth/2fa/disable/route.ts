/**
 * POST /api/auth/2fa/disable  { code }
 * Turns two-step login off; needs a current authenticator or recovery code.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { verifySecondFactor } from '@/lib/auth/two-factor'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!rateLimit(`2fa:disable:${userId}`, { maxRequests: 5, windowMs: 10 * 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code : ''
  if (!(await verifySecondFactor(userId, code))) {
    return NextResponse.json({ error: 'That code did not match.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorLastStep: null,
      twoFactorRecoveryCodes: [],
    },
  })
  return NextResponse.json({ ok: true })
}
