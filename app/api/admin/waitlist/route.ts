/**
 * GET /api/admin/waitlist
 * Waitlist and launch-page numbers, plus how many people would keep access
 * in pre-launch mode because they pay. Admins only.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, requireReviewer } from '@/lib/assessments/http'
import { waitlistStats } from '@/lib/waitlist'
import { prelaunchEnabled } from '@/lib/prelaunch'

export const dynamic = 'force-dynamic'

export async function GET() {
  return handle('Admin waitlist', async () => {
    await requireReviewer()
    const [stats, paidPeople, paidCompanies] = await Promise.all([
      waitlistStats(30),
      prisma.subscription.count({
        where: {
          userId: { not: null },
          plan: { not: 'free' },
          status: { in: ['active', 'trialing', 'past_due'] },
        },
      }),
      prisma.subscription.count({
        where: {
          companyId: { not: null },
          plan: { not: 'free' },
          status: { in: ['active', 'trialing', 'past_due'] },
        },
      }),
    ])
    return NextResponse.json({
      ...stats,
      prelaunch: prelaunchEnabled(),
      payingCustomers: { people: paidPeople, companies: paidCompanies },
    })
  })
}
