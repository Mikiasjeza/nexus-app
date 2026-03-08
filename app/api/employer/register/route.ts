/**
 * POST /api/employer/register
 * Register current user as employer - creates company and adds user as owner.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

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

    const { companyName } = parsed.data
    let baseSlug = slugify(companyName)
    if (!baseSlug) baseSlug = 'company'

    let slug = baseSlug
    let suffix = 0
    while (true) {
      const existing = await prisma.company.findUnique({ where: { slug } })
      if (!existing) break
      suffix++
      slug = `${baseSlug}-${suffix}`
    }

    const company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        slug,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: true,
      },
    })

    return NextResponse.json({
      id: company.id,
      name: company.name,
      slug: company.slug,
      role: 'owner',
    })
  } catch (e) {
    console.error('Employer register error:', e)
    return NextResponse.json(
      { error: 'Failed to register as employer' },
      { status: 500 }
    )
  }
}
