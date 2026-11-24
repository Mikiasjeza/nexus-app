/**
 * GET /api/career/profile   the signed-in person's Career Profile
 * PUT /api/career/profile   save preferences, interests, goals (partial)
 *
 * Private: only the owner can read or change it.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { loadCareerProfile, saveProfile } from '@/lib/career/profile'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

async function owner() {
  if (await isGuestRequest()) return null
  return getSessionUserId()
}

export async function GET() {
  try {
    const userId = await owner()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    return NextResponse.json(await loadCareerProfile(userId))
  } catch (e) {
    return dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not load' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await owner()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!rateLimit(`career:profile:${userId}`, { maxRequests: 60, windowMs: 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many changes. Slow down a little.' }, { status: 429 })
    }
    const profile = await saveProfile(userId, await request.json().catch(() => ({})))
    return NextResponse.json({ profile })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? 'Invalid' }, { status: 400 })
    }
    return dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}
