import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { dbErrorResponse } from '@/lib/db-error'
import { env } from '@/lib/config/env'
import { guestUser } from '@/lib/mock/guest'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (env.isGuestMode) {
      return NextResponse.json({ user: guestUser })
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ user: null })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        publicProfile: true,
        shareableId: true,
        customSlug: true,
        emailVerified: true,
        onboardingComplete: true,
        discoverableByEmployers: true,
        createdAt: true,
      },
    })
    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? undefined,
        publicProfile: user.publicProfile,
        shareableId: user.shareableId,
        customSlug: user.customSlug ?? undefined,
        emailVerified: user.emailVerified,
        onboardingComplete: user.onboardingComplete,
        discoverableByEmployers: user.discoverableByEmployers,
        createdAt: user.createdAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('Session error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json({ user: null })
  }
}
