/**
 * A company's plan and what it allows: open job listings and team seats.
 * Companies without a Business subscription are on Free's limits.
 */

import { prisma } from '@/lib/db'
import { PLAN_INFO, type SubscriptionPlan } from '@/lib/plans'
import { effectivePlan, isLiveStatus } from './status'

export type CompanyBilling = {
  plan: SubscriptionPlan
  openJobs: { used: number; limit: number }
  teamSeats: { used: number; limit: number }
  subscribed: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

export async function companyPlan(companyId: string): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: { plan: true, status: true, currentPeriodStart: true },
  })
  return effectivePlan(subscription)
}

/** Plan, limits and current use, for the company's Plan panel. */
export async function companyBilling(companyId: string): Promise<CompanyBilling> {
  const [subscription, openJobs, members, invites] = await Promise.all([
    prisma.subscription.findUnique({
      where: { companyId },
      select: {
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: true,
      },
    }),
    prisma.jobListing.count({ where: { companyId, status: 'active' } }),
    prisma.companyMember.count({ where: { companyId } }),
    pendingInvites(companyId),
  ])
  const plan = effectivePlan(subscription)
  const limits = PLAN_INFO[plan].limits
  return {
    plan,
    openJobs: { used: openJobs, limit: limits.openJobs },
    teamSeats: { used: members + invites, limit: limits.teamSeats },
    subscribed: Boolean(subscription?.stripeSubscriptionId) && isLiveStatus(subscription?.status),
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
  }
}

function pendingInvites(companyId: string) {
  return prisma.companyInvite.count({
    where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
  })
}

/** Room for another open job? `null` when there is, or the reason when not. */
export async function openJobBlock(companyId: string): Promise<string | null> {
  const plan = await companyPlan(companyId)
  const limit = PLAN_INFO[plan].limits.openJobs
  if (limit < 0) return null
  const open = await prisma.jobListing.count({ where: { companyId, status: 'active' } })
  if (open < limit) return null
  return `The ${PLAN_INFO[plan].name} plan includes ${limit} open ${limit === 1 ? 'job' : 'jobs'}. Close one, or upgrade to Business for unlimited jobs.`
}

/** Room for another teammate (members plus pending invites)? */
export async function teamSeatBlock(companyId: string): Promise<string | null> {
  const plan = await companyPlan(companyId)
  const limit = PLAN_INFO[plan].limits.teamSeats
  if (limit < 0) return null
  const [members, invites] = await Promise.all([
    prisma.companyMember.count({ where: { companyId } }),
    pendingInvites(companyId),
  ])
  if (members + invites < limit) return null
  return plan === 'business'
    ? `Business includes ${limit} teammates. Remove someone or cancel an invite first.`
    : `The Free plan includes ${limit} people. Upgrade to Business for up to ${PLAN_INFO.business.limits.teamSeats}.`
}
