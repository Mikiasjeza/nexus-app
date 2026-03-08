import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const allowed = ['name', 'bio', 'avatar', 'publicProfile', 'shareableId', 'customSlug'] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] === undefined) continue
      if (key === 'shareableId' && typeof body[key] === 'string') {
        const slug = body[key].trim().toLowerCase()
        if (!/^[a-z0-9_-]{3,20}$/.test(slug)) {
          return NextResponse.json(
            {
              error:
                'Username must be 3-20 characters: lowercase letters, numbers, hyphens, underscores',
            },
            { status: 400 }
          )
        }
        const existing = await prisma.user.findFirst({
          where: { shareableId: slug, id: { not: userId } },
        })
        if (existing) {
          return NextResponse.json(
            { error: 'This username is already taken' },
            { status: 409 }
          )
        }
        updates.shareableId = slug
      } else {
        updates[key] = body[key]
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar ?? undefined,
      bio: user.bio ?? undefined,
      publicProfile: user.publicProfile,
      shareableId: user.shareableId,
      customSlug: user.customSlug ?? undefined,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    })
  } catch (e) {
    console.error('Profile update error:', e)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
