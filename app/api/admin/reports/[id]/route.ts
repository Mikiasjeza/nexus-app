import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, readJson, requireReviewer } from '@/lib/assessments/http'

export const dynamic = 'force-dynamic'

const OUTCOMES = new Set(['actioned', 'dismissed', 'open'])

/**
 * Resolve a report: "actioned" (you dealt with it, e.g. removed the content),
 * "dismissed" (nothing wrong), or back to "open". Recorded in the audit log.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('Resolve report', async () => {
    const reviewer = await requireReviewer()
    const { id } = await params
    const body = await readJson(request, 5_000)
    const status = String(body.status ?? '')
    if (!OUTCOMES.has(status)) {
      return NextResponse.json({ error: 'Unknown outcome' }, { status: 400 })
    }
    const resolution = String(body.resolution ?? '')
      .trim()
      .slice(0, 1000)

    const existing = await prisma.report.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const reopened = status === 'open'
    const [report] = await prisma.$transaction([
      prisma.report.update({
        where: { id },
        data: {
          status,
          resolution: reopened ? null : resolution || null,
          resolvedBy: reopened ? null : reviewer,
          resolvedAt: reopened ? null : new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          actor: reviewer,
          action: `report.${status}`,
          targetType: 'Report',
          targetId: id,
          data: resolution ? { resolution } : undefined,
        },
      }),
    ])

    return NextResponse.json({ id: report.id, status: report.status })
  })
}
