import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, hasGuestPreviewSession } from '@/lib/auth/session'
import type { SkillCategory, SkillLevel } from '@/lib/types'
import { env } from '@/lib/config/env'
import { guestStats } from '@/lib/mock/guest'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (env.isGuestMode || await hasGuestPreviewSession()) {
      return NextResponse.json(guestStats)
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const skills = await prisma.skill.findMany({
      where: { userId },
      select: {
        category: true,
        level: true,
        progress: true,
        verified: true,
        createdAt: true,
      },
    })

    const skillsByCategory: Record<string, number> = {}
    const skillsByLevel: Record<string, number> = {}
    let totalProgress = 0
    for (const s of skills) {
      skillsByCategory[s.category] = (skillsByCategory[s.category] ?? 0) + 1
      skillsByLevel[s.level] = (skillsByLevel[s.level] ?? 0) + 1
      totalProgress += s.progress
    }
    const averageLevel =
      skills.length > 0 ? Math.round(totalProgress / skills.length) : 0
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentGrowth = skills.filter(
      s => s.createdAt >= thirtyDaysAgo
    ).length

    return NextResponse.json({
      totalSkills: skills.length,
      averageLevel,
      skillsByCategory: skillsByCategory as Record<SkillCategory, number>,
      skillsByLevel: skillsByLevel as Record<SkillLevel, number>,
      recentGrowth,
      verifiedSkills: skills.filter(s => s.verified).length,
    })
  } catch (e) {
    console.error('Stats error:', e)
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 }
    )
  }
}
