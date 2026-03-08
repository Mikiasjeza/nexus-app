/**
 * GET /api/employer/talent
 * Search for candidates by skills. Requires employer (CompanyMember).
 * Query: skills (comma-separated), level (optional), limit (default 20)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50)
    const skillNames = skillsParam
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

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
                  OR: skillNames.map((name) => ({
                    name: { equals: name, mode: 'insensitive' as const },
                  })),
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
      const userSkillNames = u.skills.map((s) => s.name.toLowerCase())
      const matchCount =
        skillNames.length === 0
          ? u.skills.length
          : skillNames.filter((sk) =>
              userSkillNames.some((us) => us.includes(sk) || sk.includes(us))
            ).length
      const matchScore =
        skillNames.length === 0 ? 100 : (matchCount / skillNames.length) * 100
      return { ...u, matchScore }
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
        matchScore: Math.round(matchScore),
      })),
    })
  } catch (e) {
    console.error('Employer talent search error:', e)
    return NextResponse.json(
      { error: 'Failed to search talent' },
      { status: 500 }
    )
  }
}
