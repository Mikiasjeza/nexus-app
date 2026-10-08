import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { aiClient } from '@/lib/ai/client'
import { getSessionUserId, hasGuestPreviewSession } from '@/lib/auth/session'
import { env } from '@/lib/config/env'
import { guestSkills } from '@/lib/mock/guest'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'
import { skillsLooselyMatch } from '@/lib/skills-taxonomy'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const guestMode = env.isGuestMode || (await hasGuestPreviewSession())
    const userId = guestMode ? 'guest-user' : await getSessionUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`ai-job-matches:${userId}`, { maxRequests: 8, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many match refreshes. Try again later.' },
        { status: 429 }
      )
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

    if (skills.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: 'Add a few skills to unlock AI job matching.',
          matches: [],
          model: env.ai.model,
          tokensUsed: 0,
          cost: 0,
        },
      })
    }

    const jobs = await prisma.jobListing.findMany({
      where: { status: 'active' },
      include: {
        company: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })

    const normalizedSkills = skills.map((skill) => skill.name.toLowerCase())
    const prioritizedJobs = [...jobs]
      .sort((a, b) => {
        const aOverlap = a.skills.filter((skill) =>
          normalizedSkills.some((userSkill) => skillsLooselyMatch(userSkill, skill))
        ).length
        const bOverlap = b.skills.filter((skill) =>
          normalizedSkills.some((userSkill) => skillsLooselyMatch(userSkill, skill))
        ).length
        return bOverlap - aOverlap
      })
      .slice(0, 8)

    const result = await aiClient.matchJobsForUser(
      skills,
      prioritizedJobs.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description ?? undefined,
        skills: job.skills,
        location: job.location ?? undefined,
        type: job.type,
        companyName: job.company.name,
      }))
    )

    const jobLookup = new Map(prioritizedJobs.map((job) => [job.id, job]))

    return NextResponse.json({
      success: true,
      data: {
        summary: result.summary,
        matches: result.matches.map((match) => ({
          ...match,
          job: (() => {
            const job = jobLookup.get(match.jobId)
            return job
              ? {
                  id: job.id,
                  title: job.title,
                  description: job.description ?? undefined,
                  skills: job.skills,
                  location: job.location ?? undefined,
                  type: job.type,
                  salary: job.salary ?? undefined,
                  status: job.status,
                  createdAt: job.createdAt.toISOString(),
                  company: job.company,
                }
              : null
          })(),
        })),
        model: result.model,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      },
    })
  } catch (e) {
    console.error('AI job matches error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      {
        error: 'AI job matching failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
