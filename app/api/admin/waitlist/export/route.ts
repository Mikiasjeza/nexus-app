/**
 * GET /api/admin/waitlist/export
 * Confirmed, still-subscribed waitlist emails as CSV. Admins only; every
 * export is written to the audit log.
 */

import { prisma } from '@/lib/db'
import { handle, requireReviewer } from '@/lib/assessments/http'
import { exportConfirmedCsv } from '@/lib/waitlist'

export const dynamic = 'force-dynamic'

export async function GET() {
  return handle('Admin waitlist export', async () => {
    const reviewer = await requireReviewer()
    const csv = await exportConfirmedCsv()
    await prisma.auditLog.create({
      data: {
        actor: reviewer,
        action: 'waitlist.export',
        targetType: 'LaunchWaitlist',
        targetId: 'all',
      },
    })
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="nexus-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
        'cache-control': 'no-store',
      },
    })
  })
}
