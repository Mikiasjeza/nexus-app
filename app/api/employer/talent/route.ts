/**
 * GET /api/employer/talent
 * Search for candidates by skills or pillar terms. Requires employer (CompanyMember).
 * Query: skills (comma-separated), level (optional), jobId (optional), limit (default 20)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import {
  computeJobRequirementCoverage,
  inferSkillCategory,
  normalizeSkillCategory,
  resolveSkillPillarQuery,
  skillsLooselyMatch,
} from '@/lib/skills-taxonomy'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const membership = await prisma.companyMember.findFirst({
      where: { userId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Employer access required' }, { status: 403 })
    }

    const rl = rateLimit(`employer:talent:${userId}`, { maxRequests: 60, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const skillsParam = searchParams.get('skills') || ''
    const level = searchParams.get('level') || ''
    const jobId = searchParams.get('jobId') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50)
    const skillNames = skillsParam
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const pillarQueries = skillNames
      .map((term) => resolveSkillPillarQuery(term))
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
    const targetJob = jobId
      ? await prisma.jobListing.findFirst({
          where: {
            id: jobId,
            companyId: membership.companyId,
          },
          select: {
            id: true,
            title: true,
            skills: true,
          },
        })
      : null
    const targetJobSkills = targetJob?.skills ?? []
    const targetJobPillars = Array.from(
      new Set(targetJobSkills.map((skill) => inferSkillCategory(skill)))
    )

    // Find users who are discoverable and have public profile
    const discoverableUsers = await prisma.user.findMany({
      where: {
        publicProfile: true,
        discoverableByEmployers: true,
        id: { not: userId },
        skills: {
          some: {
            visibility: 'public',
            status: 'published',
            ...(level ? { level } : {}),
            ...(skillNames.length > 0
              ? {
                  OR: skillNames.flatMap((name) => {
                    const pillar = resolveSkillPillarQuery(name)
                    return [
                      { name: { equals: name, mode: 'insensitive' as const } },
                      ...(pillar ? [{ category: pillar }] : []),
                    ]
                  }),
                }
              : {}),
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        shareableId: true,
        skills: {
          where: { visibility: 'public', status: 'published' },
          select: {
            name: true,
            level: true,
            verified: true,
            category: true,
          },
        },
      },
      take: limit * 2, // Fetch extra to filter/sort
    })

    // Score and filter by skill match
    const scored = discoverableUsers.map((u) => {
      const normalizedSkills = u.skills.map((skill) => ({
        ...skill,
        category: normalizeSkillCategory(skill.category),
      }))
      const userSkillNames = normalizedSkills.map((s) => s.name.toLowerCase())
      const userCategories = normalizedSkills.map((skill) => skill.category)
      const matchedQuerySkills = skillNames.filter((querySkill) =>
        userSkillNames.some((userSkill) => skillsLooselyMatch(userSkill, querySkill))
      )
      const matchedQueryPillars = pillarQueries.filter((pillar) => userCategories.includes(pillar))
      const matchedJobSkills = targetJobSkills.filter((jobSkill) =>
        normalizedSkills.some((userSkill) => skillsLooselyMatch(userSkill.name, jobSkill))
      )
      const matchedJobPillars = targetJobPillars.filter((pillar) => userCategories.includes(pillar))
      const jobRequirementCoverage = computeJobRequirementCoverage(
        targetJobSkills,
        normalizedSkills
      )
      const matchedVerifiedSignals = normalizedSkills.filter((skill) => {
        if (!skill.verified) return false
        return (
          matchedQuerySkills.some((querySkill) => skillsLooselyMatch(skill.name, querySkill)) ||
          matchedJobSkills.some((jobSkill) => skillsLooselyMatch(skill.name, jobSkill))
        )
      }).length

      const querySkillCoverage =
        skillNames.length > 0 ? matchedQuerySkills.length / skillNames.length : 0
      const queryPillarCoverage =
        pillarQueries.length > 0 ? matchedQueryPillars.length / pillarQueries.length : 0
      const jobSkillCoverage =
        targetJobSkills.length > 0 ? matchedJobSkills.length / targetJobSkills.length : 0
      const jobPillarCoverage =
        targetJobPillars.length > 0 ? matchedJobPillars.length / targetJobPillars.length : 0
      const jobRequirementBlend =
        targetJobSkills.length > 0
          ? jobSkillCoverage * 0.62 + jobRequirementCoverage.combinedRatio * 0.38
          : 0
      const verifiedCoverage =
        matchedJobSkills.length + matchedQuerySkills.length > 0
          ? matchedVerifiedSignals /
            Math.max(1, matchedJobSkills.length + matchedQuerySkills.length)
          : normalizedSkills.filter((skill) => skill.verified).length /
            Math.max(1, normalizedSkills.length)

      let matchScore = 100
      if (targetJob) {
        matchScore =
          jobRequirementBlend * 58 +
          jobPillarCoverage * 22 +
          querySkillCoverage * 10 +
          queryPillarCoverage * 5 +
          Math.min(1, verifiedCoverage) * 5
      } else if (skillNames.length > 0 || pillarQueries.length > 0) {
        matchScore =
          querySkillCoverage * 70 + queryPillarCoverage * 20 + Math.min(1, verifiedCoverage) * 10
      } else {
        const verifiedRatio =
          normalizedSkills.filter((skill) => skill.verified).length /
          Math.max(1, normalizedSkills.length)
        matchScore = Math.min(
          100,
          45 +
            verifiedRatio * 25 +
            Math.min(20, normalizedSkills.length * 4) +
            Math.min(10, userCategories.length * 2)
        )
      }

      return {
        ...u,
        skills: normalizedSkills,
        matchedPillars: Array.from(new Set([...matchedQueryPillars, ...matchedJobPillars])),
        matchedVerifiedSignals,
        matchScore,
      }
    })

    const sorted = scored
      .filter((u) => u.matchScore > 0 || skillNames.length === 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)

    return NextResponse.json({
      candidates: sorted.map(({ matchScore, ...u }) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar ?? undefined,
        bio: u.bio ?? undefined,
        shareableId: u.shareableId,
        skills: u.skills,
        matchedPillars: u.matchedPillars,
        matchedVerifiedSignals: u.matchedVerifiedSignals,
        matchScore: Math.round(matchScore),
      })),
      targetJob: targetJob
        ? {
            id: targetJob.id,
            title: targetJob.title,
            skills: targetJob.skills,
            pillars: targetJobPillars,
          }
        : null,
    })
  } catch (e) {
    console.error('Employer talent search error:', e)
    return NextResponse.json({ error: 'Failed to search talent' }, { status: 500 })
  }
}
