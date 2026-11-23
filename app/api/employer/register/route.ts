/**
 * POST /api/employer/register
 * Set up the employer side for the signed-in person: creates their company with
 * them as owner. Someone who already has a company just gets it back.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'
import { createCompanyForUser, employerMembership } from '@/lib/employer/company'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
})

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`employer:register:${userId}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid request'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const existing = await employerMembership(prisma, userId)
    if (existing) {
      return NextResponse.json({
        id: existing.company.id,
        name: existing.company.name,
        slug: existing.company.slug,
        role: existing.role,
      })
    }

    const company = await createCompanyForUser(prisma, userId, parsed.data.companyName)

    return NextResponse.json({
      id: company.id,
      name: company.name,
      slug: company.slug,
      role: 'owner',
    })
  } catch (e) {
    console.error('Employer register error:', e)
    return NextResponse.json({ error: 'Failed to register as employer' }, { status: 500 })
  }
}
