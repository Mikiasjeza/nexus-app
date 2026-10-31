/**
 * GET /api/employer/summary
 * What the employer dashboard shows: the discoverable talent pool by pillar
 * (public skills claimed and verified), the company's open roles and its
 * shortlists. Requires employer (CompanyMember); guests get sample data.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { GUEST_CANDIDATES, GUEST_JOBS, guestPoolList } from '@/lib/mock/employer'
import { normalizeSkillCategory, SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'

export const dynamic = 'force-dynamic'

/** Candidates employers may see: public profile and opted in to employer search. */
const EMPLOYER_VISIBLE = { publicProfile: true, discoverableByEmployers: true } as const

type SkillCount = { category: string; verified: boolean; count: number }

function byPillar(counts: SkillCount[]) {
  return SKILL_PILLAR_DETAILS.map((pillar) => {
    const inPillar = counts.filter((c) => normalizeSkillCategory(c.category) === pillar.category)
    return {
      label: pillar.shortLabel,
      claimed: inPillar.reduce((sum, c) => sum + c.count, 0),
      verified: inPillar.filter((c) => c.verified).reduce((sum, c) => sum + c.count, 0),
    }
  })
}

export async function GET() {
  try {
    if (await isGuestRequest()) {
      const skills = GUEST_CANDIDATES.flatMap((c) => c.skills)
      return NextResponse.json({
        talent: {
          discoverable: GUEST_CANDIDATES.length,
          verifiedSkills: skills.filter((s) => s.verified).length,
          byPillar: byPillar(
            skills.map((s) => ({ category: s.category, verified: s.verified, count: 1 }))
          ),
        },
        jobs: GUEST_JOBS.map(({ id, title, skills: jobSkills, createdAt }) => ({
          id,
          title,
          skills: jobSkills,
          createdAt,
        })),
        pools: guestPoolList(),
      })
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const membership = await prisma.companyMember.findFirst({ where: { userId } })
    if (!membership) {
      return NextResponse.json({ error: 'Employer access required' }, { status: 403 })
    }

    const [discoverable, grouped, jobs, pools] = await Promise.all([
      prisma.user.count({ where: { ...EMPLOYER_VISIBLE, id: { not: userId } } }),
      prisma.skill.groupBy({
        by: ['category', 'verified'],
        where: {
          visibility: 'public',
          status: 'published',
          user: { ...EMPLOYER_VISIBLE, id: { not: userId } },
        },
        _count: { _all: true },
      }),
      prisma.jobListing.findMany({
        where: { companyId: membership.companyId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, skills: true, createdAt: true },
      }),
      prisma.talentPool.findMany({
        where: { companyId: membership.companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, candidateIds: true, createdAt: true },
      }),
    ])

    const counts: SkillCount[] = grouped.map((g) => ({
      category: g.category,
      verified: g.verified,
      count: g._count._all,
    }))

    return NextResponse.json({
      talent: {
        discoverable,
        verifiedSkills: counts.filter((c) => c.verified).reduce((sum, c) => sum + c.count, 0),
        byPillar: byPillar(counts),
      },
      jobs: jobs.map((job) => ({ ...job, createdAt: job.createdAt.toISOString() })),
      // Counts here include candidates who later opted out; the pool page re-checks consent.
      pools: pools.map((pool) => ({
        id: pool.id,
        name: pool.name,
        candidateCount: pool.candidateIds.length,
        createdAt: pool.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('Employer summary error:', e)
    return NextResponse.json({ error: 'Failed to load the employer summary' }, { status: 500 })
  }
}
