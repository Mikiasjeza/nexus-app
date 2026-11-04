/**
 * The one place that decides what someone's plan lets them do. Every paid
 * feature asks here on the server; the pricing page and dashboards only
 * display what these functions decide.
 *
 * Denials explain themselves and name the plan to upgrade to. Nothing here
 * ever charges anyone or starts a checkout.
 */

import { prisma } from '@/lib/db'
import {
  PLAN_INFO,
  cheapestPlanWith,
  hasEntitlement,
  type Entitlement,
  type PlanLimits,
  type SubscriptionPlan,
} from '@/lib/plans'
import { getEffectivePlan } from '@/lib/plan-usage'
import { effectivePlan } from './status'
import { usageWindow } from './period'
import { getAllowanceSummary, type AllowanceSummary } from './usage'

export interface EntitlementSnapshot {
  plan: SubscriptionPlan
  limits: PlanLimits
  entitlements: Entitlement[]
}

export async function getEntitlements(userId: string): Promise<EntitlementSnapshot> {
  const plan = await getEffectivePlan(userId)
  return { plan, limits: PLAN_INFO[plan].limits, entitlements: PLAN_INFO[plan].entitlements }
}

export type AccessDecision =
  | { allowed: true; plan: SubscriptionPlan }
  | { allowed: false; plan: SubscriptionPlan; reason: string; upgradeTo: SubscriptionPlan | null }

const DENIED: Record<Entitlement, string> = {
  advanced_feedback: 'The reasons and evidence behind each score are part of Pro.',
  detailed_reports: 'Detailed assessment reports are part of Pro.',
  growth_analytics: 'Skill growth analytics are part of Pro.',
  all_practice_challenges: 'Every practice challenge is part of Pro.',
  career_insights: 'The AI career coach and job matching are part of Pro.',
  employer_assessments: 'Employer assessments are part of Business.',
}

export function decideFor(plan: SubscriptionPlan, entitlement: Entitlement): AccessDecision {
  if (hasEntitlement(plan, entitlement)) return { allowed: true, plan }
  return {
    allowed: false,
    plan,
    reason: DENIED[entitlement],
    upgradeTo: cheapestPlanWith(entitlement),
  }
}

async function decide(userId: string, entitlement: Entitlement): Promise<AccessDecision> {
  return decideFor(await getEffectivePlan(userId), entitlement)
}

export const canAccessAdvancedFeedback = (userId: string) => decide(userId, 'advanced_feedback')
export const canExportDetailedReport = (userId: string) => decide(userId, 'detailed_reports')
export const canAccessGrowthAnalytics = (userId: string) => decide(userId, 'growth_analytics')
export const canAccessCareerInsights = (userId: string) => decide(userId, 'career_insights')

/** Practice is open to guests, who get the Free pool. */
export async function canUseAllPracticeChallenges(userId: string | null): Promise<boolean> {
  if (!userId) return false
  return (await decide(userId, 'all_practice_challenges')).allowed
}

export type AssessmentDecision =
  | { allowed: true; plan: SubscriptionPlan; allowance: AllowanceSummary }
  | {
      allowed: false
      plan: SubscriptionPlan
      reason: string
      upgradeTo: SubscriptionPlan | null
      allowance: AllowanceSummary
    }

/** Whether this person can start another formal assessment this month. */
export async function canStartFormalAssessment(userId: string): Promise<AssessmentDecision> {
  const allowance = await getAllowanceSummary(userId)
  if (allowance.remaining > 0) return { allowed: true, plan: allowance.plan, allowance }
  return {
    allowed: false,
    plan: allowance.plan,
    reason: `You've used all ${allowance.limit} of this month's formal assessments.`,
    upgradeTo: allowance.upgradeTo,
    allowance,
  }
}

/**
 * Whether an organization can sponsor another candidate assessment: it needs
 * an active Business plan, Business must be on sale (the employer features
 * exist and are validated), and this month's allowance must have room.
 */
export async function canCreateEmployerAssessment(companyId: string): Promise<AccessDecision> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: { plan: true, status: true, currentPeriodStart: true },
  })
  const plan = effectivePlan(subscription)
  const decision = decideFor(plan, 'employer_assessments')
  if (!decision.allowed) return decision
  if (PLAN_INFO.business.availability !== 'available') {
    return {
      allowed: false,
      plan,
      reason: "Employer assessments aren't available yet.",
      upgradeTo: null,
    }
  }
  const period = await prisma.usagePeriod.findUnique({
    where: { companyId_periodStart: { companyId, periodStart: usageWindow().start } },
    select: { formalUsed: true },
  })
  const limit = PLAN_INFO[plan].limits.sponsoredAssessments
  if ((period?.formalUsed ?? 0) >= limit) {
    return {
      allowed: false,
      plan,
      reason: `Your organization has used its ${limit} candidate assessments for this month.`,
      upgradeTo: null,
    }
  }
  return { allowed: true, plan }
}

/** The JSON body for a denied request, so every route answers the same way. */
export function upgradeRequiredBody(decision: Extract<AccessDecision, { allowed: false }>) {
  return {
    error: decision.reason,
    code: 'upgrade_required',
    plan: decision.plan,
    upgradeTo: decision.upgradeTo,
  }
}
