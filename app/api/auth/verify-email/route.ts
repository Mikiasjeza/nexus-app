/**
 * POST /api/auth/verify-email  { token }
 * Confirms an email address from the link in the verification email.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { consumeVerificationToken } from '@/lib/auth/email-verification'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ token: z.string().min(1).max(200) })

const MESSAGES = {
  invalid: 'This link is not valid. It may have been used already.',
  expired: 'This link has expired. Sign in and ask for a new one.',
} as const

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`auth:verify-email:${ip}`, { maxRequests: 10, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: MESSAGES.invalid }, { status: 400 })
  }

  try {
    const outcome = await consumeVerificationToken(parsed.data.token)
    if (outcome === 'verified') return NextResponse.json({ ok: true })
    return NextResponse.json({ error: MESSAGES[outcome], reason: outcome }, { status: 400 })
  } catch (e) {
    console.error('Verify email error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
