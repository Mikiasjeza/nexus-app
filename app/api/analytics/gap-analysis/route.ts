/**
 * Gap Analysis API
 *
 * POST /api/analytics/gap-analysis
 * Body: { targetSkills: string[] } - skills required for target role
 *
 * Compares user's skills to target and returns gaps and recommendations.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const PREDEFINED_ROLES: Record<string, string[]> = {
  'frontend-developer': [
    'HTML',
    'CSS',
    'JavaScript',
    'React',
    'TypeScript',
    'UI/UX Design',
    'Responsive Design',
    'Git',
  ],
  'full-stack': [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'SQL',
    'REST APIs',
    'Git',
    'System Design',
  ],
  'data-scientist': [
    'Python',
    'SQL',
    'Data Analysis',
    'Machine Learning',
    'Statistics',
    'Data Visualization',
  ],
  'product-manager': [
    'Product Strategy',
    'Agile',
    'Stakeholder Management',
    'Data Analysis',
    'Project Management',
    'Communication',
  ],
}

function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function skillMatches(userSkill: string, targetSkill: string): boolean {
  const u = normalizeSkillName(userSkill)
  const t = normalizeSkillName(targetSkill)
  return u.includes(t) || t.includes(u)
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`gap:${userId}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const targetRole = body.targetRole as string | undefined
    const targetSkills = (body.targetSkills as string[] | undefined) ?? []

    let requiredSkills: string[] = targetSkills
    if (targetRole && PREDEFINED_ROLES[targetRole]) {
      requiredSkills = PREDEFINED_ROLES[targetRole]
    }
    if (requiredSkills.length === 0) {
      return NextResponse.json(
        { error: 'Provide targetSkills array or targetRole (frontend-developer, full-stack, data-scientist, product-manager)' },
        { status: 400 }
      )
    }

    const userSkills = await prisma.skill.findMany({
      where: { userId },
      select: { name: true, level: true, progress: true, category: true },
    })

    const matched: { target: string; userSkill: string; level: string; progress: number }[] = []
    const missing: { target: string; recommendation: string }[] = []

    for (const target of requiredSkills) {
      const found = userSkills.find(s => skillMatches(s.name, target))
      if (found) {
        matched.push({
          target,
          userSkill: found.name,
          level: found.level,
          progress: found.progress,
        })
      } else {
        missing.push({
          target,
          recommendation: `Consider adding "${target}" to your skills. Focus on building evidence through projects or courses.`,
        })
      }
    }

    const coverage = requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : 0

    return NextResponse.json({
      targetRole: targetRole ?? 'custom',
      requiredCount: requiredSkills.length,
      matchedCount: matched.length,
      missingCount: missing.length,
      coveragePercent: coverage,
      matched,
      missing,
      summary:
        coverage >= 80
          ? 'Strong alignment with target role. Consider deepening key skills.'
          : coverage >= 50
            ? 'Good foundation. Focus on filling the largest gaps first.'
            : 'Significant gaps. Prioritize high-impact skills for your target role.',
    })
  } catch (e) {
    console.error('Gap analysis error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      {
        error: 'Gap analysis failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
