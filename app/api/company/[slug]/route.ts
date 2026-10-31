/**
 * GET /api/company/[slug]
 * Public company profile by slug.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isGuestRequest } from '@/lib/auth/session'
import { GUEST_COMPANY } from '@/lib/mock/employer'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 })
    }

    if (slug === GUEST_COMPANY.slug && (await isGuestRequest())) {
      const { id, name, description } = GUEST_COMPANY
      return NextResponse.json({ company: { id, name, slug, description } })
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        website: true,
        description: true,
      },
    })

    if (!company) {
      return NextResponse.json({ company: null })
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo: company.logo ?? undefined,
        website: company.website ?? undefined,
        description: company.description ?? undefined,
      },
    })
  } catch (e) {
    console.error('Company get error:', e)
    return NextResponse.json({ error: 'Failed to load company' }, { status: 500 })
  }
}
