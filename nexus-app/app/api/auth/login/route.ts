import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'
import { env } from '@/lib/config/env'
import { guestUser } from '@/lib/mock/guest'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (env.isGuestMode) {
      return NextResponse.json(guestUser)
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`auth:login:${ip}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }
    const body = await request.json()
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json(userToJson(user))
  } catch (e) {
    console.error('Login error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

function userToJson(user: {
  id: string
  email: string
  name: string
  avatar: string | null
  bio: string | null
  publicProfile: boolean
  shareableId: string
  customSlug: string | null
  emailVerified: boolean
  createdAt: Date
}) {
  return {
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
  }
}
