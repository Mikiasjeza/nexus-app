/**
 * GET /api/auth/connections
 *
 * For Settings: which sign-in providers are switched on, and which of them
 * (and GitHub) the signed-in person has linked.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { providerSummaries } from '@/lib/auth/oauth/providers'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

const textIn = (metadata: unknown, key: string): string | null => {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' && value ? value : null
}

export async function GET() {
  try {
    const providers = providerSummaries()
    const githubAvailable = Boolean(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    )

    if (await isGuestRequest()) {
      return NextResponse.json({
        providers: providers.map((p) => ({ ...p, connected: false, account: null })),
        github: { available: githubAvailable, connected: false, account: null },
      })
    }

    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const connections = await prisma.oAuthConnection.findMany({
      where: { userId },
      select: { provider: true, metadata: true },
    })
    const find = (id: string) => connections.find((c) => c.provider === id)
    const github = find('github')

    return NextResponse.json({
      providers: providers.map((p) => {
        const connection = find(p.id)
        return {
          ...p,
          connected: Boolean(connection),
          account: connection ? textIn(connection.metadata, 'email') : null,
        }
      }),
      github: {
        available: githubAvailable,
        connected: Boolean(github),
        account: github ? textIn(github.metadata, 'login') : null,
      },
    })
  } catch (error) {
    console.error('Connections error:', error)
    return (
      dbErrorResponse(error) ??
      NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    )
  }
}
