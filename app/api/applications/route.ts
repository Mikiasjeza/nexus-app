/**
 * GET /api/applications
 * The signed-in person's own job applications, newest first.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (await isGuestRequest()) return NextResponse.json({ applications: [] })
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rows = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      jobId: true,
      status: true,
      createdAt: true,
      job: { select: { title: true, company: { select: { name: true, slug: true } } } },
    },
  })
  return NextResponse.json({
    applications: rows.map((r) => ({
      jobId: r.jobId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      title: r.job.title,
      company: r.job.company,
    })),
  })
}
