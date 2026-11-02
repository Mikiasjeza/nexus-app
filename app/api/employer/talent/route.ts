/**
 * GET /api/employer/talent
 * Search for candidates by skills or pillar terms. Requires employer (CompanyMember).
 * Query: skills (comma-separated), level (optional), jobId (optional), limit (default 20)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guestTalentSearch } from '@/lib/mock/employer'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { resolveSkillPillarQuery } from '@/lib/skills-taxonomy'
import { jobPillars, parseTalentTerms, rankTalent } from '@/lib/employer/talent-ranking'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json(guestTalentSearch(new URL(request.url).searchParams))
    }
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
    const level = searchParams.get('level') || ''
    const jobId = searchParams.get('jobId') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50)
    const skillNames = parseTalentTerms(searchParams.get('skills') || '')
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

    const ranked = rankTalent(discoverableUsers, {
      skillNames,
      hasTargetJob: Boolean(targetJob),
      targetJobSkills: targetJob?.skills ?? [],
    }).slice(0, limit)

    return NextResponse.json({
      candidates: ranked.map(({ matchScore, ...u }) => ({
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
            pillars: jobPillars(targetJob.skills),
          }
        : null,
    })
  } catch (e) {
    console.error('Employer talent search error:', e)
    return NextResponse.json({ error: 'Failed to search talent' }, { status: 500 })
  }
}
