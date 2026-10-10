/**
 * Server-side plan lookups and quota checks. lib/plans.ts stays client-safe;
 * anything that reads the database lives here.
 */

import { prisma } from '@/lib/db'
import { PLAN_INFO, type SubscriptionPlan } from '@/lib/plans'

/** The plan whose limits apply right now. A lapsed paid plan falls back to free. */
export async function getEffectivePlan(userId: string): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  })
  const plan = subscription?.plan as SubscriptionPlan | undefined
  if (!plan || !(plan in PLAN_INFO)) return 'free'
  if (!['active', 'trialing'].includes(subscription!.status)) return 'free'
  return plan
}

export type QuotaCheck =
  | { allowed: true; plan: SubscriptionPlan }
  | { allowed: false; plan: SubscriptionPlan; limit: number; used: number }

function startOfMonth(): Date {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function checkAiAnalysisQuota(userId: string): Promise<QuotaCheck> {
  const plan = await getEffectivePlan(userId)
  const limit = PLAN_INFO[plan].limits.aiAnalyses
  if (limit < 0) return { allowed: true, plan }
  const used = await prisma.aIAnalysis.count({
    where: { userId, createdAt: { gte: startOfMonth() } },
  })
  return used < limit ? { allowed: true, plan } : { allowed: false, plan, limit, used }
}

export async function checkSkillQuota(userId: string, adding = 1): Promise<QuotaCheck> {
  const plan = await getEffectivePlan(userId)
  const limit = PLAN_INFO[plan].limits.skills
  if (limit < 0) return { allowed: true, plan }
  const used = await prisma.skill.count({ where: { userId } })
  return used + adding <= limit ? { allowed: true, plan } : { allowed: false, plan, limit, used }
}
