import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`auth:reset-password:${ip}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() },
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    // Opening the emailed link proves the mailbox is theirs, so this is also
    // how an account is recovered. Every older way in goes with the old
    // password: other devices are signed out and linked accounts (Google,
    // Microsoft, LinkedIn, GitHub) are removed. Someone who registered this
    // address first, or linked their own account to it, keeps no access.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetExpires: null,
          emailVerified: true,
        },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.oAuthConnection.deleteMany({ where: { userId: user.id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Reset password error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
