/**
 * GET /api/employer/jobs/:id/applicants
 * Everyone who applied to one of your company's jobs, with their verified skills.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { membershipFor } from '@/lib/employer/access'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const membership = await membershipFor(userId)
    const { id } = await params
    const job = await prisma.jobListing.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, skills: true, companyId: true },
    })
    // Same answer for "no such job" and "not your company's job".
    if (!job || !membership || job.companyId !== membership.companyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId: id, status: { not: 'withdrawn' } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            shareableId: true,
            skills: { select: { name: true, verified: true, level: true } },
          },
        },
      },
    })

    return NextResponse.json({
      job: { id: job.id, title: job.title, status: job.status, skills: job.skills },
      role: membership.role,
      applicants: applications.map((a) => ({
        id: a.id,
        status: a.status,
        message: a.message,
        appliedAt: a.createdAt.toISOString(),
        name: a.user.name,
        email: a.user.email,
        passportPath: `/share/${a.user.shareableId}`,
        verifiedSkills: a.user.skills.filter((s) => s.verified).map((s) => s.name),
        skillCount: a.user.skills.length,
      })),
    })
  } catch (e) {
    console.error('Applicants error:', e)
    return NextResponse.json({ error: 'Could not load applicants' }, { status: 500 })
  }
}
