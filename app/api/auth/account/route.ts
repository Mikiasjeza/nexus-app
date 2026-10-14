/**
 * DELETE /api/auth/account
 *
 * Permanently deletes the signed-in user's account and everything tied to it
 * (skills, evidence, history, AI analyses, activity, sessions, OAuth links,
 * subscription row, company memberships) via Prisma cascades. Additionally:
 * - cancels any live Stripe subscription first, so a deleted user is never billed;
 * - removes the user from every employer talent pool (stored as a plain ID array,
 *   so no cascade covers it);
 * - deletes companies where the user was the only member (cascades their job
 *   listings and talent pools);
 * - best-effort deletes uploaded evidence files from storage.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, clearSessionCookie } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'
import { storageService } from '@/lib/storage/upload'

export const dynamic = 'force-dynamic'

const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due']

export async function DELETE(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`account:delete:${userId}`, { maxRequests: 3, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Type DELETE to confirm account deletion' },
        { status: 400 }
      )
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true, status: true },
    })
    if (
      subscription?.stripeSubscriptionId &&
      LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)
    ) {
      try {
        const { stripe } = await import('@/lib/integrations/stripe')
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
      } catch (err) {
        console.error('Account deletion: Stripe cancel failed:', err)
        return NextResponse.json(
          {
            error:
              'We could not cancel your subscription, so your account was not deleted. Please try again or cancel under Manage Billing first.',
          },
          { status: 502 }
        )
      }
    }

    // Collect file keys before the evidence rows disappear.
    const files = await prisma.evidence.findMany({
      where: { skill: { userId }, fileUrl: { not: null } },
      select: { fileUrl: true },
    })

    await prisma.$transaction(async (tx) => {
      // Remove the user from every employer shortlist.
      const pools = await tx.talentPool.findMany({
        where: { candidateIds: { has: userId } },
        select: { id: true, candidateIds: true },
      })
      for (const pool of pools) {
        await tx.talentPool.update({
          where: { id: pool.id },
          data: { candidateIds: pool.candidateIds.filter((id) => id !== userId) },
        })
      }

      // Delete companies this user is the last member of.
      const memberships = await tx.companyMember.findMany({
        where: { userId },
        select: { companyId: true, company: { select: { _count: { select: { members: true } } } } },
      })
      const soleCompanyIds = memberships
        .filter((m) => m.company._count.members <= 1)
        .map((m) => m.companyId)
      if (soleCompanyIds.length > 0) {
        await tx.company.deleteMany({ where: { id: { in: soleCompanyIds } } })
      }

      await tx.user.delete({ where: { id: userId } })
    })

    await Promise.allSettled(
      files.map((f) => {
        const key = f.fileUrl ? storageService.keyFromUrl(f.fileUrl) : null
        return key ? storageService.deleteFile(key) : Promise.resolve()
      })
    )

    await clearSessionCookie()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Account deletion error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 })
  }
}
