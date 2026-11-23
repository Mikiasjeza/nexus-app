/**
 * POST /api/reports  { targetType, targetId, reason, details? }
 * A signed-in person flags a profile, job or company for an admin to review.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import {
  MAX_DETAILS,
  REPORT_REASONS,
  REPORT_TARGETS,
  describeTarget,
  type ReportReason,
} from '@/lib/reports'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().min(1).max(200),
  reason: z.enum(Object.keys(REPORT_REASONS) as [ReportReason, ...ReportReason[]]),
  details: z.string().trim().max(MAX_DETAILS).optional(),
})

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account to report something.' }, { status: 403 })
    }
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to report something.' }, { status: 401 })
    }
    if (!rateLimit(`reports:${userId}`, { maxRequests: 10, windowMs: 60 * 60_000 }).allowed) {
      return NextResponse.json(
        { error: 'You have sent a lot of reports. Try again later.' },
        { status: 429 }
      )
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Choose a reason for your report.' }, { status: 400 })
    }
    const { targetType, targetId, reason, details } = parsed.data

    const target = await describeTarget(targetType, targetId)
    if (!target) {
      return NextResponse.json({ error: 'We could not find that.' }, { status: 404 })
    }
    if (target.ownerId === userId) {
      return NextResponse.json({ error: 'You cannot report yourself.' }, { status: 400 })
    }

    // One open report per person per thing; a repeat just updates it.
    const existing = await prisma.report.findFirst({
      where: { reporterId: userId, targetType, targetId, status: 'open' },
      select: { id: true },
    })
    if (existing) {
      await prisma.report.update({
        where: { id: existing.id },
        data: { reason, details: details || null },
      })
    } else {
      await prisma.report.create({
        data: { reporterId: userId, targetType, targetId, reason, details: details || null },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Report error:', e)
    return NextResponse.json({ error: 'Could not send your report.' }, { status: 500 })
  }
}
