/**
 * GET /api/employer/pools - List talent pools
 * POST /api/employer/pools - Create talent pool
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const membership = await prisma.companyMember.findFirst({
      where: { userId },
      include: { company: true },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Employer access required' }, { status: 403 })
    }

    const pools = await prisma.talentPool.findMany({
      where: { companyId: membership.companyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      pools: pools.map((p) => ({
        id: p.id,
        name: p.name,
        candidateCount: p.candidateIds.length,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('Pools list error:', e)
    return NextResponse.json(
      { error: 'Failed to load pools' },
      { status: 500 }
    )
  }
}

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const membership = await prisma.companyMember.findFirst({
      where: { userId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Employer access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const pool = await prisma.talentPool.create({
      data: {
        companyId: membership.companyId,
        name: parsed.data.name,
      },
    })

    return NextResponse.json({
      id: pool.id,
      name: pool.name,
      candidateCount: 0,
      createdAt: pool.createdAt.toISOString(),
    })
  } catch (e) {
    console.error('Pool create error:', e)
    return NextResponse.json(
      { error: 'Failed to create pool' },
      { status: 500 }
    )
  }
}
