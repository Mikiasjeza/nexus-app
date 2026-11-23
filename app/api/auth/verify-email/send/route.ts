/**
 * POST /api/auth/verify-email/send
 * Emails the signed-in person a new verification link.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { emailDeliveryConfigured, sendVerificationEmail } from '@/lib/auth/email-verification'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (!emailDeliveryConfigured()) {
    return NextResponse.json({ error: 'Email is not set up yet' }, { status: 503 })
  }
  if (!rateLimit(`auth:verify-send:${userId}`, { maxRequests: 3, windowMs: 10 * 60_000 }).allowed) {
    return NextResponse.json(
      { error: 'We just sent one. Check your inbox, or try again in a few minutes.' },
      { status: 429 }
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    })
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true })

    await sendVerificationEmail(user)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Send verification email error:', e)
    return NextResponse.json(
      { error: 'Could not send the email. Try again later.' },
      { status: 500 }
    )
  }
}
