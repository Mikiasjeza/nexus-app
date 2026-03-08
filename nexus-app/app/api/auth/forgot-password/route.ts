import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/utils/rateLimit'
import { emailService } from '@/lib/email/client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`auth:forgot-password:${ip}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetExpires = new Date(Date.now() + 1000 * 60 * 30)
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpires },
      })
      try {
        await emailService.sendPasswordResetEmail(user.email, resetToken)
      } catch {
        // Keep response generic to avoid account enumeration.
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Forgot password error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
