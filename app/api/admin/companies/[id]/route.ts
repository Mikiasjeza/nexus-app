import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, readJson, requireReviewer } from '@/lib/assessments/http'
import { refreshDomainVerification } from '@/lib/employer/verification'

export const dynamic = 'force-dynamic'

const ACTIONS = new Set(['verify', 'unverify', 'automatic'])

/**
 * Set a company's badge by hand:
 *   verify     badge on, and the automatic check leaves it alone
 *   unverify   badge off, and the automatic check leaves it alone
 *   automatic  hand the badge back to the email-domain check
 * Recorded in the audit log.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('Verify company', async () => {
    const reviewer = await requireReviewer()
    const { id } = await params
    const body = await readJson(request, 2_000)
    const action = String(body.action ?? '')
    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
    const existing = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data =
      action === 'verify'
        ? { verifiedAt: new Date(), verifiedVia: 'admin' }
        : action === 'unverify'
          ? { verifiedAt: null, verifiedVia: 'admin' }
          : { verifiedAt: null, verifiedVia: null }

    await prisma.$transaction([
      prisma.company.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: { actor: reviewer, action: `company.${action}`, targetType: 'Company', targetId: id },
      }),
    ])
    if (action === 'automatic') await refreshDomainVerification(id)

    const company = await prisma.company.findUnique({
      where: { id },
      select: { verifiedAt: true, verifiedVia: true },
    })
    return NextResponse.json({
      id,
      verified: Boolean(company?.verifiedAt),
      verifiedVia: company?.verifiedVia ?? null,
    })
  })
}
