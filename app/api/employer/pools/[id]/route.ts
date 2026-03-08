/**
 * GET /api/employer/pools/[id] - Get pool with candidates
 * PATCH /api/employer/pools/[id] - Update pool (add/remove candidates)
 * DELETE /api/employer/pools/[id] - Delete pool
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const pool = await prisma.talentPool.findFirst({
      where: {
        id,
        companyId: membership.companyId,
      },
    })
    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    const candidates = await prisma.user.findMany({
      where: { id: { in: pool.candidateIds } },
      select: {
        id: true,
        name: true,
        avatar: true,
        shareableId: true,
        skills: {
          where: { visibility: 'public' },
          select: { name: true, level: true, verified: true },
        },
      },
    })

    return NextResponse.json({
      id: pool.id,
      name: pool.name,
      candidateIds: pool.candidateIds,
      candidates,
      createdAt: pool.createdAt.toISOString(),
    })
  } catch (e) {
    console.error('Pool get error:', e)
    return NextResponse.json(
      { error: 'Failed to load pool' },
      { status: 500 }
    )
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  addCandidateId: z.string().optional(),
  removeCandidateId: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const pool = await prisma.talentPool.findFirst({
      where: {
        id,
        companyId: membership.companyId,
      },
    })
    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let candidateIds = [...pool.candidateIds]
    if (parsed.data.addCandidateId && !candidateIds.includes(parsed.data.addCandidateId)) {
      candidateIds.push(parsed.data.addCandidateId)
    }
    if (parsed.data.removeCandidateId) {
      candidateIds = candidateIds.filter((id) => id !== parsed.data.removeCandidateId)
    }

    const updated = await prisma.talentPool.update({
      where: { id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        candidateIds,
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      candidateCount: updated.candidateIds.length,
    })
  } catch (e) {
    console.error('Pool update error:', e)
    return NextResponse.json(
      { error: 'Failed to update pool' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    await prisma.talentPool.deleteMany({
      where: {
        id,
        companyId: membership.companyId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Pool delete error:', e)
    return NextResponse.json(
      { error: 'Failed to delete pool' },
      { status: 500 }
    )
  }
}
