/**
 * GET  /api/employer/team                    members and pending invites
 * POST /api/employer/team  { email, role }   invite someone (owners and admins)
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { emailService } from '@/lib/email/client'
import { inviteEmailHtml, inviteEmailText } from '@/lib/email/templates'
import { emailDeliveryConfigured } from '@/lib/auth/email-verification'
import {
  INVITE_DAYS,
  TEAM_ROLES,
  canManageTeam,
  membershipFor,
  newInviteToken,
} from '@/lib/employer/access'
import { getAppUrl } from '@/lib/config/env'
import { rateLimit } from '@/lib/utils/rateLimit'
import { teamSeatBlock } from '@/lib/billing/company'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (await isGuestRequest()) return NextResponse.json({ members: [], invites: [], role: 'viewer' })
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const membership = await membershipFor(userId)
  if (!membership)
    return NextResponse.json({ error: 'No company for this account' }, { status: 404 })

  const [members, invites] = await Promise.all([
    prisma.companyMember.findMany({
      where: { companyId: membership.companyId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, userId: true, user: { select: { name: true, email: true } } },
    }),
    canManageTeam(membership.role)
      ? prisma.companyInvite.findMany({
          where: {
            companyId: membership.companyId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, role: true, expiresAt: true },
        })
      : Promise.resolve([]),
  ])

  return NextResponse.json({
    role: membership.role,
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      name: m.user.name,
      email: m.user.email,
      isYou: m.userId === userId,
    })),
    invites: invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() })),
  })
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(TEAM_ROLES),
})

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Guest preview is read-only.' }, { status: 403 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const membership = await membershipFor(userId)
    if (!membership || !canManageTeam(membership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can invite.' }, { status: 403 })
    }
    if (!emailDeliveryConfigured()) {
      return NextResponse.json(
        { error: 'Email is not set up yet, so invites cannot be sent.' },
        { status: 503 }
      )
    }
    if (
      !rateLimit(`team:invite:${membership.companyId}`, { maxRequests: 20, windowMs: 60 * 60_000 })
        .allowed
    ) {
      return NextResponse.json({ error: 'Too many invites. Try again later.' }, { status: 429 })
    }

    const parsed = inviteSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid invite' },
        { status: 400 }
      )
    }
    const { email, role } = parsed.data

    const existingMember = await prisma.companyMember.findFirst({
      where: { companyId: membership.companyId, user: { email } },
      select: { id: true },
    })
    if (existingMember) {
      return NextResponse.json({ error: 'They are already on your team.' }, { status: 409 })
    }

    // Re-sending to someone already invited doesn't take another seat.
    const alreadyInvited = await prisma.companyInvite.findFirst({
      where: {
        companyId: membership.companyId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    })
    if (!alreadyInvited) {
      const limit = await teamSeatBlock(membership.companyId)
      if (limit) {
        return NextResponse.json({ error: limit, upgrade: true }, { status: 402 })
      }
    }

    // A fresh invite replaces any pending one for the same address.
    await prisma.companyInvite.deleteMany({
      where: { companyId: membership.companyId, email, acceptedAt: null },
    })
    const { token, tokenHash } = newInviteToken()
    const invite = await prisma.companyInvite.create({
      data: {
        companyId: membership.companyId,
        email,
        role,
        tokenHash,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    })

    const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    const details = {
      companyName: membership.company.name,
      inviterName: inviter?.name ?? 'A teammate',
      role,
      url: `${getAppUrl()}/employer/invite?token=${encodeURIComponent(token)}`,
      days: INVITE_DAYS,
    }
    await emailService.sendEmail({
      to: email,
      subject: `Join ${membership.company.name} on Nexus`,
      html: inviteEmailHtml(details),
      text: inviteEmailText(details),
    })

    return NextResponse.json({
      ok: true,
      invite: { ...invite, expiresAt: invite.expiresAt.toISOString() },
    })
  } catch (e) {
    console.error('Invite error:', e)
    return NextResponse.json({ error: 'Could not send the invite.' }, { status: 500 })
  }
}
