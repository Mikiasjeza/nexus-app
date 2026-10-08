/**
 * GET /api/auth/account/export
 *
 * Data-portability export: everything we hold about the signed-in user as a
 * single JSON download. Secrets (password hash, session/reset tokens, OAuth
 * tokens) are deliberately excluded.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`account:export:${userId}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many export requests. Try again later.' }, { status: 429 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        publicProfile: true,
        shareableId: true,
        customSlug: true,
        emailVerified: true,
        onboardingComplete: true,
        discoverableByEmployers: true,
        companyMembers: {
          select: { role: true, createdAt: true, company: { select: { name: true, slug: true } } },
        },
        createdAt: true,
        updatedAt: true,
        skills: { include: { evidence: true, history: true } },
        aiAnalyses: {
          select: {
            id: true,
            skillId: true,
            evidenceId: true,
            model: true,
            confidenceScore: true,
            explanation: true,
            suggestedLevel: true,
            improvements: true,
            tokensUsed: true,
            createdAt: true,
          },
        },
        activities: true,
        subscriptions: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            createdAt: true,
          },
        },
        oauthConnections: {
          select: { provider: true, providerId: true, metadata: true, createdAt: true },
        },
        sessions: { select: { createdAt: true, expiresAt: true } },
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(
      JSON.stringify({ exportedAt: new Date().toISOString(), format: 'nexus-export-v1', account: user }, null, 2),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="nexus-data-${date}.json"`,
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (e) {
    console.error('Account export error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
