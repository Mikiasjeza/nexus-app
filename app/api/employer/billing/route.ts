/**
 * GET /api/employer/billing
 * The company's plan, what it allows and how much is in use.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { canManageTeam, membershipFor } from '@/lib/employer/access'
import { companyBilling } from '@/lib/billing/company'
import { billingErrorResponse } from '@/lib/billing/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Billing is off in the guest preview.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const membership = await membershipFor(userId)
    if (!membership) {
      return NextResponse.json({ error: 'No company for this account' }, { status: 404 })
    }
    const billing = await companyBilling(membership.companyId)
    return NextResponse.json({ ...billing, canManage: canManageTeam(membership.role) })
  } catch (e) {
    return billingErrorResponse('api/employer/billing', e)
  }
}
