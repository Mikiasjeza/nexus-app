/**
 * POST /api/jobs/feedback  { ref, helpful, reason? }
 * Feedback on a recommendation. "Not relevant" hides the job for this person.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  ref: z.string().regex(/^(ext|nexus):[a-z0-9]{10,40}$/),
  helpful: z.boolean(),
  reason: z.string().trim().max(300).optional(),
})

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account first.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!rateLimit(`jobs:feedback:${userId}`, { maxRequests: 60, windowMs: 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
    }
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 })
    const { ref, helpful, reason } = parsed.data
    await prisma.jobFeedback.upsert({
      where: { userId_jobRef: { userId, jobRef: ref } },
      create: { userId, jobRef: ref, helpful, reason: reason || null },
      update: { helpful, reason: reason || null },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}
