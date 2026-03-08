/**
 * POST /api/auth/onboarding
 * Marks onboarding as complete for the current user.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { dbErrorResponse } from '@/lib/db-error'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  goals: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
}).transform((v) => ({
  goals: v.goals ?? [],
  skills: v.skills ?? [],
}))

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = rateLimit(`auth:onboarding:${userId}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    const { goals, skills } = parsed.success ? parsed.data : { goals: [] as string[], skills: [] as string[] }

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingComplete: true },
    })

    // Optionally store goals/skills in metadata or activity
    if (goals.length || skills.length) {
      await prisma.activity.create({
        data: {
          userId,
          type: 'onboarding_complete',
          message: 'Completed onboarding',
          metadata: { goals, skills },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Onboarding complete error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
