/**
 * POST /api/auth/2fa/challenge  { code }
 * The second sign-in step: with the challenge cookie from the first step and a
 * valid authenticator or recovery code, creates the session.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { clearGuestPreviewCookie, createSession, setSessionCookie } from '@/lib/auth/session'
import { clearChallenge, readChallenge, verifySecondFactor } from '@/lib/auth/two-factor'
import { noteSignIn } from '@/lib/auth/login-alert'
import { safeNextPath } from '@/lib/auth/safe-redirect'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const challenge = await readChallenge()
  if (!challenge) {
    return NextResponse.json(
      { error: 'This sign-in has expired. Start again.', expired: true },
      { status: 401 }
    )
  }
  // Per account, so guessing from many addresses doesn't help.
  if (
    !rateLimit(`2fa:challenge:${challenge.uid}`, { maxRequests: 5, windowMs: 5 * 60_000 }).allowed
  ) {
    return NextResponse.json({ error: 'Too many attempts. Wait a few minutes.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code : ''
  if (!(await verifySecondFactor(challenge.uid, code))) {
    return NextResponse.json({ error: 'That code did not match.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: challenge.uid },
    select: { id: true, email: true, name: true, onboardingComplete: true },
  })
  if (!user) return NextResponse.json({ error: 'Start again.', expired: true }, { status: 401 })

  await clearChallenge()
  const token = await createSession(user.id)
  await clearGuestPreviewCookie()
  await setSessionCookie(token)
  await noteSignIn(user, request)

  return NextResponse.json({
    ok: true,
    next: user.onboardingComplete === false ? '/onboarding' : safeNextPath(challenge.next),
  })
}
