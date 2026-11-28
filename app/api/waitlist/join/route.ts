/**
 * POST /api/waitlist/join  { email, consent: true, source?, website?, turnstileToken? }
 * Joins the launch waitlist (double opt-in). Protected by a rate limit,
 * Cloudflare Turnstile (when configured) and a honeypot field. Always gives
 * the same answer, so it never reveals whether an email is already listed.
 */

import { NextResponse } from 'next/server'
import { joinSchema, joinWaitlist } from '@/lib/waitlist'
import { TURNSTILE_FAILED, TURNSTILE_FIELD, verifyTurnstile } from '@/lib/security/turnstile'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const DONE = { ok: true, message: 'Almost there: check your inbox to confirm your spot.' }

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(`waitlist:join:${ip}`, { maxRequests: 5, windowMs: 60 * 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }
    const body = await request.json().catch(() => ({}))
    if (!(await verifyTurnstile(body?.[TURNSTILE_FIELD], request))) {
      return NextResponse.json({ error: TURNSTILE_FAILED }, { status: 400 })
    }
    const parsed = joinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Please check your details.' },
        { status: 400 }
      )
    }
    await joinWaitlist(parsed.data)
    return NextResponse.json(DONE)
  } catch (e) {
    console.error('Waitlist join failed:', e instanceof Error ? e.message : e)
    return (
      dbErrorResponse(e) ??
      NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    )
  }
}
