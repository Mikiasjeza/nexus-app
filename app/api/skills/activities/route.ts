import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { mapActivity } from '@/lib/skills-mapper'
import { env } from '@/lib/config/env'
import { guestActivities } from '@/lib/mock/guest'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (env.isGuestMode) {
      const { searchParams } = new URL(request.url)
      const limitParam = searchParams.get('limit')
      const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : guestActivities.length
      return NextResponse.json(guestActivities.slice(0, limit))
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : undefined

    const activities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
    return NextResponse.json(activities.map(mapActivity))
  } catch (e) {
    console.error('Activities list error:', e)
    return NextResponse.json(
      { error: 'Failed to load activities' },
      { status: 500 }
    )
  }
}
