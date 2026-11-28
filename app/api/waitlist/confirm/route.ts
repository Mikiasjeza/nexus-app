/** GET /api/waitlist/confirm?token=...  Confirms a waitlist signup from the emailed link. */

import { NextResponse } from 'next/server'
import { confirmSignup } from '@/lib/waitlist'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`waitlist:confirm:${ip}`, { maxRequests: 30, windowMs: 60_000 }).allowed) {
    return NextResponse.redirect(new URL('/coming-soon?waitlist=slow', url))
  }
  const ok = await confirmSignup(url.searchParams.get('token') ?? '').catch(() => false)
  return NextResponse.redirect(
    new URL(`/coming-soon?waitlist=${ok ? 'confirmed' : 'expired'}`, url)
  )
}
