/**
 * POST /api/career/resume/apply  { education[], experience[], certifications[] }
 * Saves only the items the person approved, through the same validation as
 * adding them by hand. Everything is stored as self-reported. Skills are
 * saved by the client through /api/auth/onboarding (complete: false).
 */

import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { ProfileError, createRecord } from '@/lib/career/profile'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  education: z.array(z.unknown()).max(10).default([]),
  experience: z.array(z.unknown()).max(20).default([]),
  certifications: z.array(z.unknown()).max(15).default([]),
})

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account first.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (
      !rateLimit(`career:resume-apply:${userId}`, { maxRequests: 10, windowMs: 60 * 60_000 })
        .allowed
    ) {
      return NextResponse.json({ error: 'Too many imports. Try again later.' }, { status: 429 })
    }
    const body = bodySchema.parse(await request.json().catch(() => ({})))
    const saved = { education: 0, experience: 0, certifications: 0 }
    const skipped: string[] = []
    for (const kind of ['education', 'experience', 'certifications'] as const) {
      for (const item of body[kind]) {
        try {
          await createRecord(userId, kind, item)
          saved[kind] += 1
        } catch (e) {
          if (e instanceof ZodError || e instanceof ProfileError) {
            skipped.push(kind)
            continue
          }
          throw e
        }
      }
    }
    return NextResponse.json({ saved, skipped: skipped.length })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid import' }, { status: 400 })
    }
    return dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}
