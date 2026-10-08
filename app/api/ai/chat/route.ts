import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { aiClient } from '@/lib/ai/client'
import { getSessionUserId, hasGuestPreviewSession } from '@/lib/auth/session'
import { env } from '@/lib/config/env'
import { guestSkills } from '@/lib/mock/guest'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  message: z.string().min(2).max(1000),
})

export async function POST(request: NextRequest) {
  try {
    const guestMode = env.isGuestMode || await hasGuestPreviewSession()
    const userId = guestMode ? 'guest-user' : await getSessionUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`ai-chat:${userId}`, { maxRequests: 12, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many chat requests. Try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const skills = guestMode
      ? guestSkills.map((skill) => ({
          name: skill.name,
          level: skill.level,
          verified: skill.verified,
        }))
      : await prisma.skill.findMany({
          where: { userId },
          select: { name: true, level: true, verified: true },
          orderBy: [{ verified: 'desc' }, { progress: 'desc' }],
          take: 12,
        })

    const jobs = await prisma.jobListing.findMany({
      where: { status: 'active' },
      include: {
        company: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const result = await aiClient.chatCareerCoach(
      parsed.data.message,
      skills,
      jobs.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description ?? undefined,
        skills: job.skills,
        location: job.location ?? undefined,
        type: job.type,
        companyName: job.company.name,
      }))
    )

    return NextResponse.json({
      success: true,
      data: {
        reply: result.reply,
        suggestedPrompts: result.suggestedPrompts,
        model: result.model,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      },
    })
  } catch (e) {
    console.error('AI chat error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      {
        error: 'AI chat failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
