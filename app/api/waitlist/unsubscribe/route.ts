/**
 * GET /api/waitlist/unsubscribe?token=...  One-click unsubscribe from the
 * waitlist. No sign-in needed: the emailed link is the proof.
 */

import { NextResponse } from 'next/server'
import { unsubscribeSignup } from '@/lib/waitlist'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`waitlist:unsub:${ip}`, { maxRequests: 30, windowMs: 60_000 }).allowed) {
    return NextResponse.redirect(new URL('/coming-soon?waitlist=slow', url))
  }
  const ok = await unsubscribeSignup(url.searchParams.get('token') ?? '').catch(() => false)
  return NextResponse.redirect(
    new URL(`/coming-soon?waitlist=${ok ? 'unsubscribed' : 'expired'}`, url)
  )
}
