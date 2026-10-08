/**
 * Analytics Export API
 *
 * GET /api/analytics/export?format=csv|json
 *
 * Exports user analytics. Requires auth. Rate limited.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { mapSkill } from '@/lib/skills-mapper'
import { dbErrorResponse } from '@/lib/db-error'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'

export const dynamic = 'force-dynamic'

function escapeCsv(val: unknown): string {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function generateCSV(
  skills: { name: string; level: string; category: string; progress: number; createdAt: string; updatedAt: string }[],
  activities: { type: string; skillName: string | null; message: string; timestamp: Date }[],
  summary: {
    totalSkills: number
    verifiedSkills: number
    averageProgress: number
    pillarCounts: Record<string, number>
  }
): string {
  const skillHeaders = ['Skill Name', 'Level', 'Pillar', 'Progress', 'Created At', 'Updated At']
  const skillRows = skills.map(s => [
    escapeCsv(s.name),
    escapeCsv(s.level),
    escapeCsv(s.category),
    escapeCsv(s.progress),
    escapeCsv(s.createdAt),
    escapeCsv(s.updatedAt),
  ])
  const activityHeaders = ['Type', 'Skill', 'Message', 'Timestamp']
  const activityRows = activities.map(a => [
    escapeCsv(a.type),
    escapeCsv(a.skillName),
    escapeCsv(a.message),
    escapeCsv(a.timestamp.toISOString()),
  ])
  return [
    'Summary',
    'Total Skills,Verified Skills,Average Progress',
    `${summary.totalSkills},${summary.verifiedSkills},${summary.averageProgress}`,
    '',
    'Pillars',
    'Pillar,Count',
    ...Object.entries(summary.pillarCounts).map(([pillar, count]) => `${escapeCsv(pillar)},${escapeCsv(count)}`),
    '',
    'Skills',
    skillHeaders.join(','),
    ...skillRows.map(r => r.join(',')),
    '',
    'Activities',
    activityHeaders.join(','),
    ...activityRows.map(r => r.join(',')),
  ].join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`export:${userId}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many export requests. Try again later.' },
        { status: 429 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'

    const [skills, activities] = await Promise.all([
      prisma.skill.findMany({
        where: { userId },
        include: { evidence: true, history: { orderBy: { timestamp: 'desc' } } },
        orderBy: { order: 'asc' },
      }),
      prisma.activity.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      }),
    ])

    const mappedSkills = skills.map(mapSkill)
    const summary = {
      totalSkills: mappedSkills.length,
      verifiedSkills: mappedSkills.filter((skill) => skill.verified).length,
      averageProgress:
        mappedSkills.length > 0
          ? Math.round(mappedSkills.reduce((sum, skill) => sum + skill.progress, 0) / mappedSkills.length)
          : 0,
      pillarCounts: Object.fromEntries(
        SKILL_PILLAR_DETAILS.map((pillar) => [
          pillar.category,
          mappedSkills.filter((skill) => skill.category === pillar.category).length,
        ])
      ),
    }

    if (format === 'csv') {
      const csv = generateCSV(mappedSkills, activities, summary)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="skill-passport-analytics-${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        summary,
        skills: mappedSkills,
        activities: activities.map(a => ({
          id: a.id,
          type: a.type,
          skillId: a.skillId,
          skillName: a.skillName,
          message: a.message,
          timestamp: a.timestamp.toISOString(),
        })),
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="skill-passport-analytics-${Date.now()}.json"`,
        },
      }
    )
  } catch (e) {
    console.error('Export error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      {
        error: 'Export failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
