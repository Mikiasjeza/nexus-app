/** Shared plumbing for the signed-in job routes (tracker, alerts). */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export async function signedIn(limitKey: string): Promise<string | NextResponse> {
  if (await isGuestRequest()) {
    return NextResponse.json({ error: 'Create an account first.' }, { status: 401 })
  }
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!rateLimit(`${limitKey}:${userId}`, { maxRequests: 60, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many requests. Slow down a little.' }, { status: 429 })
  }
  return userId
}

export function failure(e: unknown): NextResponse {
  if (e instanceof ZodError) {
    return NextResponse.json({ error: e.errors[0]?.message ?? 'Invalid' }, { status: 400 })
  }
  const status = (e as { status?: unknown })?.status
  if (e instanceof Error && typeof status === 'number') {
    return NextResponse.json({ error: e.message }, { status })
  }
  return dbErrorResponse(e) ?? NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
}

export const body = (request: Request) => request.json().catch(() => ({}))
