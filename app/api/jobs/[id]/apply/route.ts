/**
 * POST   /api/jobs/:id/apply  { message? }  apply (or re-apply after withdrawing)
 * DELETE /api/jobs/:id/apply               withdraw
 *
 * Applying shares the person's name, email and passport with the company.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { notifyCompany } from '@/lib/notifications'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ message: z.string().trim().max(2000).optional() })

async function signedInCandidate(): Promise<{ error: NextResponse } | { userId: string }> {
  if (await isGuestRequest()) {
    return { error: NextResponse.json({ error: 'Create an account to apply.' }, { status: 403 }) }
  }
  const userId = await getSessionUserId()
  if (!userId) {
    return { error: NextResponse.json({ error: 'Sign in to apply.' }, { status: 401 }) }
  }
  return { userId }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const who = await signedInCandidate()
    if ('error' in who) return who.error
    const { userId } = who
    if (!rateLimit(`apply:${userId}`, { maxRequests: 20, windowMs: 60 * 60_000 }).allowed) {
      return NextResponse.json(
        { error: 'Too many applications. Try again later.' },
        { status: 429 }
      )
    }

    const { id } = await params
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Keep your note under 2,000 characters.' }, { status: 400 })
    }

    const job = await prisma.jobListing.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, companyId: true },
    })
    if (!job || job.status !== 'active') {
      return NextResponse.json({ error: 'This role is no longer open.' }, { status: 404 })
    }
    const insider = await prisma.companyMember.findFirst({
      where: { userId, companyId: job.companyId },
      select: { id: true },
    })
    if (insider) {
      return NextResponse.json({ error: 'You work at this company.' }, { status: 400 })
    }

    const message = parsed.data.message || null
    const application = await prisma.jobApplication.upsert({
      where: { jobId_userId: { jobId: job.id, userId } },
      create: { jobId: job.id, userId, message },
      update: { message, status: 'submitted' },
      select: { id: true, status: true },
    })
    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    await notifyCompany(job.companyId, {
      type: 'applied',
      title: `${applicant?.name ?? 'Someone'} applied to ${job.title}`,
      href: `/employer/jobs/${job.id}/applicants`,
    })
    return NextResponse.json({ ok: true, application })
  } catch (e) {
    console.error('Apply error:', e)
    return NextResponse.json({ error: 'Could not send your application.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const who = await signedInCandidate()
    if ('error' in who) return who.error
    const { id } = await params
    const updated = await prisma.jobApplication.updateMany({
      where: { jobId: id, userId: who.userId, status: { not: 'withdrawn' } },
      data: { status: 'withdrawn' },
    })
    if (updated.count === 0) {
      return NextResponse.json({ error: 'No application to withdraw.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Withdraw error:', e)
    return NextResponse.json({ error: 'Could not withdraw.' }, { status: 500 })
  }
}
