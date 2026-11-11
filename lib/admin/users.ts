/**
 * The admin's view of accounts: a searchable list and one person's record.
 * Read-only, and never includes password hashes, session tokens or reset
 * tokens.
 *
 * Callers must check the admin list first (requireReviewer in
 * lib/assessments/http.ts).
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getAssessment } from '@/lib/assessments/catalog'
import { usageWindow } from '@/lib/billing/period'
import { normalizePlan, type SubscriptionPlan } from '@/lib/plans'
import { SIGN_IN_PROVIDER_IDS } from '@/lib/auth/oauth/providers'
import { PAYING_STATUSES, signInMethods } from './overview'

export const USERS_PAGE_SIZE = 25

export type PlanFilter = 'all' | 'paid' | 'free'
export type MethodFilter = 'all' | 'email' | (typeof SIGN_IN_PROVIDER_IDS)[number]

export interface UserFilters {
  query?: string
  plan?: PlanFilter
  method?: MethodFilter
  page?: number
}

const paidSubscription: Prisma.SubscriptionWhereInput = {
  plan: { not: 'free' },
  status: { in: PAYING_STATUSES },
}

function whereFor({ query, plan, method }: UserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}
  const text = (query ?? '').trim().slice(0, 100)
  if (text) {
    where.OR = [
      { name: { contains: text, mode: 'insensitive' } },
      { email: { contains: text, mode: 'insensitive' } },
    ]
  }
  if (plan === 'paid') where.subscriptions = { some: paidSubscription }
  if (plan === 'free') where.subscriptions = { none: paidSubscription }
  if (method === 'email') {
    where.oauthConnections = { none: { provider: { in: SIGN_IN_PROVIDER_IDS } } }
  } else if (method && method !== 'all') {
    where.oauthConnections = { some: { provider: method } }
  }
  return where
}

/** The plan someone is on right now: a lapsed paid subscription counts as free. */
function currentPlan(subscriptions: { plan: string; status: string }[]): SubscriptionPlan {
  const paid = subscriptions.find((s) => s.plan !== 'free' && PAYING_STATUSES.includes(s.status))
  return paid ? normalizePlan(paid.plan) : 'free'
}

const latest = (...dates: (Date | null | undefined)[]): Date | null =>
  dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null)

export async function listUsers(filters: UserFilters = {}) {
  const where = whereFor(filters)
  const page = Math.max(1, Math.floor(filters.page ?? 1))

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        onboardingComplete: true,
        createdAt: true,
        subscriptions: { select: { plan: true, status: true } },
        oauthConnections: { select: { provider: true } },
      },
    }),
  ])

  const ids = users.map((user) => user.id)
  const [attempts, credentials, sessions, activities] = await Promise.all([
    prisma.assessmentAttempt.groupBy({
      by: ['userId', 'result'],
      where: { userId: { in: ids } },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    prisma.credential.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, status: 'ACTIVE' },
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _max: { createdAt: true },
    }),
    prisma.activity.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _max: { timestamp: true },
    }),
  ])

  return {
    total,
    page,
    pageSize: USERS_PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)),
    users: users.map((user) => {
      const own = attempts.filter((row) => row.userId === user.id)
      // Signing out removes the session, so this is the latest trace we still hold.
      const lastActive = latest(
        sessions.find((row) => row.userId === user.id)?._max.createdAt,
        activities.find((row) => row.userId === user.id)?._max.timestamp,
        ...own.map((row) => row._max.updatedAt)
      )
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        onboardingComplete: user.onboardingComplete,
        createdAt: user.createdAt.toISOString(),
        plan: currentPlan(user.subscriptions),
        methods: signInMethods(user.oauthConnections.map((c) => c.provider)),
        assessments: own.reduce((sum, row) => sum + row._count._all, 0),
        passed: own.find((row) => row.result === 'PASSED')?._count._all ?? 0,
        credentials: credentials.find((row) => row.userId === user.id)?._count._all ?? 0,
        lastActiveAt: lastActive?.toISOString() ?? null,
      }
    }),
  }
}

export type AdminUserList = Awaited<ReturnType<typeof listUsers>>
export type AdminUserRow = AdminUserList['users'][number]

const textIn = (metadata: unknown, key: string): string | null => {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' && value ? value : null
}

/** Everything the admin area shows about one person, or null when there is no such account. */
export async function userDetail(id: string, now: Date = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      onboardingComplete: true,
      publicProfile: true,
      discoverableByEmployers: true,
      shareableId: true,
      createdAt: true,
      subscriptions: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          stripeCustomerId: true,
          firstPaidAt: true,
        },
      },
      oauthConnections: {
        orderBy: { createdAt: 'asc' },
        select: { provider: true, metadata: true, createdAt: true },
      },
      companyMembers: { select: { role: true, company: { select: { name: true, slug: true } } } },
      waitlistEntries: { select: { plan: true, createdAt: true } },
    },
  })
  if (!user) return null

  const window = usageWindow(now)
  const [
    skills,
    verifiedSkills,
    attemptsTotal,
    credentialsInForce,
    attempts,
    credentials,
    activity,
    usage,
    lastSession,
  ] = await Promise.all([
    prisma.skill.count({ where: { userId: id } }),
    prisma.skill.count({ where: { userId: id, verified: true } }),
    prisma.assessmentAttempt.count({ where: { userId: id } }),
    prisma.credential.count({ where: { userId: id, status: 'ACTIVE', expiresAt: { gt: now } } }),
    prisma.assessmentAttempt.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        assessmentSlug: true,
        mode: true,
        status: true,
        result: true,
        score: true,
        createdAt: true,
        completedAt: true,
        updatedAt: true,
      },
    }),
    prisma.credential.findMany({
      where: { userId: id },
      orderBy: { issuedAt: 'desc' },
      take: 25,
      select: {
        id: true,
        skillName: true,
        level: true,
        score: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
      },
    }),
    prisma.activity.findMany({
      where: { userId: id },
      orderBy: { timestamp: 'desc' },
      take: 12,
      select: { id: true, message: true, timestamp: true },
    }),
    prisma.usagePeriod.findUnique({
      where: { userId_periodStart: { userId: id, periodStart: window.start } },
      select: { formalUsed: true, formalLimit: true, practiceRounds: true },
    }),
    prisma.session.findFirst({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  const paid = user.subscriptions.find(
    (s) => s.plan !== 'free' && PAYING_STATUSES.includes(s.status)
  )
  const subscription = paid ?? user.subscriptions[0] ?? null
  const lastActive = latest(
    lastSession?.createdAt,
    activity[0]?.timestamp,
    ...attempts.map((a) => a.updatedAt)
  )

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    onboardingComplete: user.onboardingComplete,
    publicProfile: user.publicProfile,
    discoverableByEmployers: user.discoverableByEmployers,
    profilePath: user.publicProfile ? `/share/${user.shareableId}` : null,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: lastActive?.toISOString() ?? null,
    plan: currentPlan(user.subscriptions),
    subscription: subscription && {
      plan: normalizePlan(subscription.plan),
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeCustomerId: subscription.stripeCustomerId,
      firstPaidAt: subscription.firstPaidAt?.toISOString() ?? null,
    },
    methods: signInMethods(user.oauthConnections.map((c) => c.provider)),
    connections: user.oauthConnections.map((c) => ({
      provider: c.provider,
      account: textIn(c.metadata, 'email') ?? textIn(c.metadata, 'login'),
      connectedAt: c.createdAt.toISOString(),
    })),
    skills: { total: skills, verified: verifiedSkills },
    // The lists below are the most recent 25; these are the full counts.
    totals: { attempts: attemptsTotal, credentialsInForce },
    usage: usage && {
      formalUsed: usage.formalUsed,
      formalLimit: usage.formalLimit,
      practiceRounds: usage.practiceRounds,
    },
    attempts: attempts.map((a) => ({
      id: a.id,
      skillName: getAssessment(a.assessmentSlug)?.skillName ?? a.assessmentSlug,
      mode: a.mode,
      status: a.status,
      result: a.result,
      score: a.score,
      createdAt: a.createdAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    credentials: credentials.map((c) => ({
      id: c.id,
      skillName: c.skillName,
      level: c.level,
      score: c.score,
      status: c.status === 'ACTIVE' && c.expiresAt <= now ? 'EXPIRED' : c.status,
      issuedAt: c.issuedAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
    })),
    activity: activity.map((a) => ({
      id: a.id,
      message: a.message,
      at: a.timestamp.toISOString(),
    })),
    companies: user.companyMembers.map((m) => ({
      name: m.company.name,
      slug: m.company.slug,
      role: m.role,
    })),
    waitlist: user.waitlistEntries.map((w) => ({
      plan: normalizePlan(w.plan),
      joinedAt: w.createdAt.toISOString(),
    })),
  }
}

export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof userDetail>>>
