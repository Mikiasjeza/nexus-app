import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`auth:register:${ip}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }
    const body = await request.json()
    const { email, password, name } = body
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    const emailNorm = String(email).toLowerCase().trim()
    const existing = await prisma.user.findUnique({
      where: { email: emailNorm },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(String(password), 10)
    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        name: String(name).trim(),
        passwordHash,
      },
    })

    const token = await createSession(user.id)
    await setSessionCookie(token)

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
    console.error('Register error:', e)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
