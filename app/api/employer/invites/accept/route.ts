/**
 * POST /api/employer/invites/accept  { token }
 * Joins the company named in an invite. The signed-in account's email must be
 * the one invited, and an account belongs to one company at a time.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { hashInviteToken } from '@/lib/employer/access'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
    if (!rateLimit(`invite:accept:${userId}`, { maxRequests: 10, windowMs: 10 * 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token || token.length > 200) {
      return NextResponse.json({ error: 'This invite link is not valid.' }, { status: 400 })
    }

    const invite = await prisma.companyInvite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        expiresAt: true,
        acceptedAt: true,
        company: { select: { name: true } },
      },
    })
    if (!invite || invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This invite has already been used or was cancelled.' },
        { status: 400 }
      )
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired. Ask for a new one.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This invite is for ${invite.email}. Sign in with that address to accept it.`,
          wrongAccount: true,
        },
        { status: 403 }
      )
    }

    const current = await prisma.companyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    })
    if (current && current.companyId !== invite.companyId) {
      return NextResponse.json(
        { error: 'Your account already belongs to another company.' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      ...(current
        ? []
        : [
            prisma.companyMember.create({
              data: { userId, companyId: invite.companyId, role: invite.role },
            }),
          ]),
      prisma.companyInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
      prisma.user.update({ where: { id: userId }, data: { onboardingComplete: true } }),
    ])
    return NextResponse.json({ ok: true, companyName: invite.company.name })
  } catch (e) {
    console.error('Accept invite error:', e)
    return NextResponse.json({ error: 'Could not accept the invite.' }, { status: 500 })
  }
}
