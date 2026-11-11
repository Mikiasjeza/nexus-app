/**
 * The admin overview: who has joined, who is active, what they are doing,
 * and what needs attention. Read-only.
 *
 * Callers must check the admin list first (requireReviewer in
 * lib/assessments/http.ts): everything here is about other people.
 */

import { prisma } from '@/lib/db'
import { getAssessment } from '@/lib/assessments/catalog'
import { judge0Configured } from '@/lib/assessments/runners/judge0'
import { adminEmails } from '@/lib/auth/admin'
import { liveBillingApproved } from '@/lib/billing/catalog'
import { stripeMode } from '@/lib/billing/stripe-client'
import { normalizePlan, type SubscriptionPlan } from '@/lib/plans'
import {
  getSignInProvider,
  providerCredentials,
  SIGN_IN_PROVIDER_IDS,
} from '@/lib/auth/oauth/providers'

const DAY_MS = 86_400_000
export const SERIES_DAYS = 30

/** Subscription states that mean someone is on a paid plan right now. */
export const PAYING_STATUSES = ['active', 'trialing', 'past_due']

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

/** One entry per UTC day from `from`, oldest first, with `empty` where nothing happened. */
export function fillDays<T extends object>(
  rows: ({ day: Date } & T)[],
  from: Date,
  days: number,
  empty: T
): ({ date: string } & T)[] {
  const byDay = new Map(rows.map(({ day, ...rest }) => [dayKey(day), rest as unknown as T]))
  return Array.from({ length: days }, (_, i) => {
    const date = dayKey(new Date(from.getTime() + i * DAY_MS))
    return { date, ...(byDay.get(date) ?? empty) }
  })
}

/** Linked providers as the names shown in the admin area; nothing linked means email and password. */
export function signInMethods(providers: string[]): string[] {
  const linked = SIGN_IN_PROVIDER_IDS.filter((id) => providers.includes(id)).map(
    (id) => getSignInProvider(id)!.label
  )
  return linked.length > 0 ? linked : ['Email']
}

export async function adminOverview(now: Date = new Date()) {
  const today = startOfUtcDay(now)
  const seriesFrom = new Date(today.getTime() - (SERIES_DAYS - 1) * DAY_MS)
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS)
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS)
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS)

  const [
    totalUsers,
    newThisWeek,
    newLastWeek,
    confirmedEmails,
    onboarded,
    activeRows,
    signupRows,
    attemptRows,
    attemptsByStatus,
    passedThisMonth,
    finishedThisMonth,
    activeCredentials,
    openAppeals,
    failedWebhooks,
    paying,
    waitlist,
    companies,
    activeJobs,
    providerRows,
    usersWithProvider,
    topAssessments,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.user.count({ where: { onboardingComplete: true } }),
    // "Active": signed in, worked on an assessment, or changed a skill.
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "userId")::int AS count FROM (
        SELECT "userId" FROM "Session" WHERE "createdAt" >= ${weekAgo}
        UNION SELECT "userId" FROM "AssessmentAttempt" WHERE "updatedAt" >= ${weekAgo}
        UNION SELECT "userId" FROM "Activity" WHERE "timestamp" >= ${weekAgo}
      ) AS seen`,
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "User" WHERE "createdAt" >= ${seriesFrom}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; started: number; passed: number }[]>`
      SELECT date_trunc('day', "createdAt") AS day,
             COUNT(*)::int AS started,
             (COUNT(*) FILTER (WHERE "result" = 'PASSED'))::int AS passed
      FROM "AssessmentAttempt" WHERE "createdAt" >= ${seriesFrom}
      GROUP BY 1 ORDER BY 1`,
    prisma.assessmentAttempt.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.assessmentAttempt.count({
      where: { status: 'COMPLETED', result: 'PASSED', completedAt: { gte: monthAgo } },
    }),
    prisma.assessmentAttempt.count({
      where: { status: 'COMPLETED', completedAt: { gte: monthAgo } },
    }),
    prisma.credential.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
    prisma.assessmentAppeal.count({ where: { status: 'OPEN' } }),
    prisma.stripeWebhookEvent.count({ where: { status: 'failed', updatedAt: { gte: weekAgo } } }),
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { userId: { not: null }, plan: { not: 'free' }, status: { in: PAYING_STATUSES } },
      _count: { _all: true },
    }),
    prisma.waitlistEntry.count(),
    prisma.company.count(),
    prisma.jobListing.count({ where: { status: 'active' } }),
    prisma.oAuthConnection.groupBy({
      by: ['provider'],
      where: { provider: { in: SIGN_IN_PROVIDER_IDS } },
      _count: { _all: true },
    }),
    prisma.user.count({
      where: { oauthConnections: { some: { provider: { in: SIGN_IN_PROVIDER_IDS } } } },
    }),
    prisma.assessmentAttempt.groupBy({
      by: ['assessmentSlug'],
      where: { createdAt: { gte: monthAgo } },
      _count: { _all: true },
      orderBy: { _count: { assessmentSlug: 'desc' } },
      take: 6,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        oauthConnections: { select: { provider: true } },
      },
    }),
  ])

  const statusCount = (status: string) =>
    attemptsByStatus.find((row) => row.status === status)?._count._all ?? 0
  const payingTotal = paying.reduce((sum, row) => sum + row._count._all, 0)

  return {
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      newThisWeek,
      newLastWeek,
      activeThisWeek: activeRows[0]?.count ?? 0,
      confirmedEmails,
      onboarded,
    },
    assessments: {
      total: attemptsByStatus.reduce((sum, row) => sum + row._count._all, 0),
      inProgress: statusCount('IN_PROGRESS'),
      finishedThisMonth,
      passedThisMonth,
      activeCredentials,
    },
    attention: {
      pendingReview: statusCount('PENDING_REVIEW'),
      failedGradings: statusCount('FAILED_SYSTEM'),
      openAppeals,
      failedWebhooks,
    },
    plans: {
      paying: payingTotal,
      free: Math.max(0, totalUsers - payingTotal),
      byPlan: paying.map((row) => ({
        plan: normalizePlan(row.plan) as SubscriptionPlan,
        count: row._count._all,
      })),
      waitlist,
    },
    employers: { companies, activeJobs },
    signIn: {
      // People with no provider linked sign in with their email and password.
      emailOnly: Math.max(0, totalUsers - usersWithProvider),
      providers: SIGN_IN_PROVIDER_IDS.map((id) => ({
        id,
        label: getSignInProvider(id)!.label,
        users: providerRows.find((row) => row.provider === id)?._count._all ?? 0,
        on: providerCredentials(getSignInProvider(id)!) !== null,
      })),
    },
    series: {
      days: SERIES_DAYS,
      signups: fillDays(signupRows, seriesFrom, SERIES_DAYS, { count: 0 }),
      assessments: fillDays(attemptRows, seriesFrom, SERIES_DAYS, { started: 0, passed: 0 }),
    },
    topAssessments: topAssessments.map((row) => ({
      slug: row.assessmentSlug,
      skillName: getAssessment(row.assessmentSlug)?.skillName ?? row.assessmentSlug,
      started: row._count._all,
    })),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      methods: signInMethods(user.oauthConnections.map((c) => c.provider)),
    })),
    setup: {
      admins: adminEmails().length,
      stripeMode: stripeMode(),
      liveBillingApproved: liveBillingApproved(),
      codeRunner: judge0Configured(),
      email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    },
  }
}

export type AdminOverview = Awaited<ReturnType<typeof adminOverview>>
