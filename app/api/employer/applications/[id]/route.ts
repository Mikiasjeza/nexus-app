/**
 * PATCH /api/employer/applications/:id  { status }
 * Moves an applicant along: shortlisted, rejected, or back to submitted.
 * Owners, admins and recruiters only.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { canManageHiring, membershipFor } from '@/lib/employer/access'

export const dynamic = 'force-dynamic'

const STATUSES = new Set(['submitted', 'shortlisted', 'rejected'])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const membership = await membershipFor(userId)
    const { id } = await params
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      select: { status: true, job: { select: { companyId: true } } },
    })
    if (!application || !membership || application.job.companyId !== membership.companyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!canManageHiring(membership.role)) {
      return NextResponse.json({ error: 'Viewers cannot change applications.' }, { status: 403 })
    }
    if (application.status === 'withdrawn') {
      return NextResponse.json({ error: 'The candidate withdrew.' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const status = typeof body.status === 'string' ? body.status : ''
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
    }
    await prisma.jobApplication.update({ where: { id }, data: { status } })
    return NextResponse.json({ ok: true, status })
  } catch (e) {
    console.error('Application update error:', e)
    return NextResponse.json({ error: 'Could not update the application' }, { status: 500 })
  }
}
