import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { mapSkill } from '@/lib/skills-mapper'

/**
 * Public route: get user profile and public skills by shareableId.
 * No auth required. Returns only public profile and published public skills.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareableId: string }> }
) {
  try {
    const { shareableId } = await params
    if (!shareableId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { shareableId },
      select: {
        id: true,
        name: true,
        bio: true,
        publicProfile: true,
        shareableId: true,
        avatar: true,
      },
    })
    if (!user || !user.publicProfile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const skills = await prisma.skill.findMany({
      where: {
        userId: user.id,
        visibility: 'public',
        status: 'published',
      },
      include: { evidence: true, history: { orderBy: { timestamp: 'desc' } } },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        bio: user.bio ?? undefined,
        publicProfile: user.publicProfile,
        shareableId: user.shareableId,
        avatar: user.avatar ?? undefined,
      },
      skills: skills.map(mapSkill),
    })
  } catch (e) {
    console.error('Share profile error:', e)
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    )
  }
}
