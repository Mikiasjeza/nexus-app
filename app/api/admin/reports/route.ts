import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, requireReviewer } from '@/lib/assessments/http'
import {
  REPORT_STATUSES,
  describeTarget,
  type ReportStatus,
  type ReportTarget,
} from '@/lib/reports'

export const dynamic = 'force-dynamic'

/** Admin report queue: open first by default, newest first, 50 at a time. */
export async function GET(request: NextRequest) {
  return handle('Admin reports', async () => {
    await requireReviewer()
    const requested = request.nextUrl.searchParams.get('status') as ReportStatus
    const status = REPORT_STATUSES.includes(requested) ? requested : 'open'

    const [reports, counts] = await Promise.all([
      prisma.report.findMany({
        where: { status },
        orderBy: { createdAt: status === 'open' ? 'asc' : 'desc' },
        take: 50,
        include: { reporter: { select: { name: true, email: true } } },
      }),
      prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
    ])

    const items = await Promise.all(
      reports.map(async (r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        target: await describeTarget(r.targetType as ReportTarget, r.targetId),
        reason: r.reason,
        details: r.details,
        status: r.status,
        resolution: r.resolution,
        resolvedBy: r.resolvedBy,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        reporter: r.reporter ? { name: r.reporter.name, email: r.reporter.email } : null,
      }))
    )

    return NextResponse.json(
      {
        status,
        reports: items,
        counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  })
}
