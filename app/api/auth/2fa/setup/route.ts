/**
 * POST /api/auth/2fa/setup
 * Starts setting up two-step login: a new secret (kept pending until a code
 * from the app confirms it) and the otpauth address for the QR code.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { encryptSecret, generateSecret, otpauthUrl } from '@/lib/auth/totp'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (await isGuestRequest()) {
    return NextResponse.json({ error: 'Create an account to use two-step login.' }, { status: 403 })
  }
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!rateLimit(`2fa:setup:${userId}`, { maxRequests: 10, windowMs: 10 * 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabledAt: true },
  })
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (user.twoFactorEnabledAt) {
    return NextResponse.json({ error: 'Two-step login is already on.' }, { status: 409 })
  }

  const secret = generateSecret()
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: encryptSecret(secret), twoFactorLastStep: null },
  })
  return NextResponse.json({ secret, otpauthUrl: otpauthUrl(secret, user.email) })
}
