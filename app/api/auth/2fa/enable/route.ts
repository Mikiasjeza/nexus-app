/**
 * POST /api/auth/2fa/enable  { code }
 * Turns two-step login on once a code from the app matches the pending
 * secret, and returns ten recovery codes (shown once; only hashes are kept).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { decryptSecret, generateRecoveryCodes, hashRecoveryCode, matchStep } from '@/lib/auth/totp'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!rateLimit(`2fa:enable:${userId}`, { maxRequests: 10, windowMs: 10 * 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code : ''
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabledAt: true },
  })
  if (!user?.twoFactorSecret || user.twoFactorEnabledAt) {
    return NextResponse.json({ error: 'Start the setup again.' }, { status: 409 })
  }

  const step = matchStep(decryptSecret(user.twoFactorSecret), code)
  if (step === null) {
    return NextResponse.json(
      { error: 'That code did not match. Check the time on your phone and try the newest code.' },
      { status: 400 }
    )
  }

  const recoveryCodes = generateRecoveryCodes()
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorLastStep: step,
      twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
    },
  })
  return NextResponse.json({ ok: true, recoveryCodes })
}
