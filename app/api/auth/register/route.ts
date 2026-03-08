import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  email: z.string().email('Invalid email format').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(200).transform((v) => v.trim()),
})

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`auth:register:${ip}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { email: emailNorm, password, name } = parsed.data
    const existing = await prisma.user.findUnique({
      where: { email: emailNorm },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        name,
        passwordHash,
        onboardingComplete: false,
      },
    })

    // Create free subscription for new user
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: 'free',
        status: 'active',
      },
      update: {},
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
      onboardingComplete: user.onboardingComplete,
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
