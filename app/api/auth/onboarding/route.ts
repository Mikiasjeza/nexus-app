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

const MAX_ONBOARDING_SKILLS = 15

function normalizeSkillName(skill: string) {
  return skill.trim().replace(/\s+/g, ' ')
}

function inferSkillCategory(skill: string) {
  const normalized = skill.toLowerCase()

  if (/(react|next|node|javascript|typescript|python|java|sql|aws|cloud|devops|api|frontend|backend|full stack|c\+\+|c#)/.test(normalized)) {
    return 'Technical'
  }

  if (/(figma|ux|ui|design|prototype|wireframe|brand)/.test(normalized)) {
    return 'Design'
  }

  if (/(data|analytics|bi|tableau|power bi|machine learning|ai|prompt)/.test(normalized)) {
    return 'Data'
  }

  if (/(marketing|seo|content|social media|growth|email)/.test(normalized)) {
    return 'Marketing'
  }

  if (/(sales|finance|strategy|operations|customer success|product|project)/.test(normalized)) {
    return 'Business'
  }

  if (/(leadership|management|coaching|mentoring)/.test(normalized)) {
    return 'Leadership'
  }

  if (/(communication|public speaking|writing|negotiation|presentation)/.test(normalized)) {
    return 'Communication'
  }

  if (/(creative|copywriting|video|illustration|photography)/.test(normalized)) {
    return 'Creative'
  }

  return 'Other'
}

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
    const sanitizedGoals = Array.from(new Set(goals.map(goal => goal.trim()).filter(Boolean)))
    const sanitizedSkills = Array.from(
      new Set(
        skills
          .map(normalizeSkillName)
          .filter(Boolean)
          .slice(0, MAX_ONBOARDING_SKILLS)
      )
    )

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      })

      const existingSkills = await tx.skill.findMany({
        where: { userId },
        select: { name: true },
        orderBy: { order: 'asc' },
      })

      const existingSkillNames = new Set(
        existingSkills.map(skill => skill.name.toLowerCase())
      )

      const createdSkills: string[] = []
      let nextOrder = existingSkills.length

      for (const skillName of sanitizedSkills) {
        if (existingSkillNames.has(skillName.toLowerCase())) {
          continue
        }

        const skill = await tx.skill.create({
          data: {
            userId,
            name: skillName,
            level: 'beginner',
            category: inferSkillCategory(skillName),
            progress: 10,
            order: nextOrder,
            visibility: 'public',
            status: 'published',
          },
        })

        await tx.skillHistory.create({
          data: {
            skillId: skill.id,
            userId,
            changes: [{ field: 'created', oldValue: null, newValue: 'skill created during onboarding' }],
          },
        })

        createdSkills.push(skill.name)
        existingSkillNames.add(skill.name.toLowerCase())
        nextOrder += 1
      }

      await tx.activity.create({
        data: {
          userId,
          type: 'onboarding_complete',
          message: createdSkills.length > 0
            ? `Completed onboarding and added ${createdSkills.length} skills`
            : 'Completed onboarding',
          metadata: { goals: sanitizedGoals, skills: sanitizedSkills, createdSkills },
        },
      })

      return { createdSkills }
    })

    return NextResponse.json({ success: true, createdSkills: result.createdSkills })
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
