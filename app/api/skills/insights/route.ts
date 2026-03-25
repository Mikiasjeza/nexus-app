import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, hasGuestPreviewSession } from '@/lib/auth/session'
import type { SkillInsight } from '@/lib/types'
import { env } from '@/lib/config/env'
import { guestInsights } from '@/lib/mock/guest'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (env.isGuestMode || await hasGuestPreviewSession()) {
      return NextResponse.json(guestInsights)
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const skills = await prisma.skill.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, name: true, progress: true },
    })

    const insights: SkillInsight[] = skills.slice(0, 5).map(skill => {
      const trend =
        skill.progress > 70 ? 'up' : skill.progress < 40 ? 'down' : 'stable'
      const change = Math.floor(Math.random() * 20) - 10
      const recommendation =
        skill.progress < 50
          ? 'Consider adding more evidence to boost this skill'
          : skill.progress < 80
            ? "You're making great progress! Keep it up."
            : 'Excellent skill level! Consider mentoring others.'
      return {
        skillId: skill.id,
        skillName: skill.name,
        trend,
        change,
        recommendation,
      }
    })

    return NextResponse.json(insights)
  } catch (e) {
    console.error('Insights error:', e)
    return NextResponse.json(
      { error: 'Failed to load insights' },
      { status: 500 }
    )
  }
}
