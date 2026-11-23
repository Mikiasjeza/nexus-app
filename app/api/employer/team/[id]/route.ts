/**
 * PATCH  /api/employer/team/:id  { role }   change a member's role
 * DELETE /api/employer/team/:id             remove a member, or cancel an invite
 *
 * Owners and admins only. Owners can't be changed or removed here, so a
 * company always keeps its owner.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { canManageTeam, isTeamRole, membershipFor } from '@/lib/employer/access'

export const dynamic = 'force-dynamic'

async function manager() {
  const userId = await getSessionUserId()
  if (!userId) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  const membership = await membershipFor(userId)
  if (!membership || !canManageTeam(membership.role)) {
    return {
      error: NextResponse.json({ error: 'Only owners and admins can do that.' }, { status: 403 }),
    }
  }
  return { membership }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await manager()
  if ('error' in who) return who.error
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  if (!isTeamRole(body.role)) return NextResponse.json({ error: 'Unknown role' }, { status: 400 })

  const member = await prisma.companyMember.findUnique({
    where: { id },
    select: { companyId: true, role: true },
  })
  if (!member || member.companyId !== who.membership.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (member.role === 'owner') {
    return NextResponse.json({ error: "The owner's role can't be changed." }, { status: 400 })
  }
  await prisma.companyMember.update({ where: { id }, data: { role: body.role } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await manager()
  if ('error' in who) return who.error
  const { id } = await params

  const member = await prisma.companyMember.findUnique({
    where: { id },
    select: { companyId: true, role: true },
  })
  if (member && member.companyId === who.membership.companyId) {
    if (member.role === 'owner') {
      return NextResponse.json({ error: "The owner can't be removed." }, { status: 400 })
    }
    await prisma.companyMember.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  const invite = await prisma.companyInvite.findUnique({
    where: { id },
    select: { companyId: true },
  })
  if (invite && invite.companyId === who.membership.companyId) {
    await prisma.companyInvite.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
