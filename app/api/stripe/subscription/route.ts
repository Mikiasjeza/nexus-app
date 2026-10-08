import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    })

    return NextResponse.json({
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : {
            plan: 'free',
            status: 'active',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
    })
  } catch (e) {
    Sentry.logger.error('Subscription GET failed', {
      route: 'api/stripe/subscription',
      gateway: 'stripe',
      errorMessage: e instanceof Error ? e.message : 'unknown',
    })
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
  }
}
