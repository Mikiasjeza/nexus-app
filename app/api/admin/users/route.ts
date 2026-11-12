import { NextRequest, NextResponse } from 'next/server'
import { handle, requireReviewer } from '@/lib/assessments/http'
import { listUsers, type MethodFilter, type PlanFilter } from '@/lib/admin/users'
import { SIGN_IN_PROVIDER_IDS } from '@/lib/auth/oauth/providers'

export const dynamic = 'force-dynamic'

const PLANS: PlanFilter[] = ['all', 'paid', 'free']
const METHODS: MethodFilter[] = ['all', 'email', ...SIGN_IN_PROVIDER_IDS]

/** Admin user list: newest first, 25 a page, with search and two filters. */
export async function GET(request: NextRequest) {
  return handle('Admin users', async () => {
    await requireReviewer()
    const params = request.nextUrl.searchParams
    const plan = params.get('plan') as PlanFilter
    const method = params.get('method') as MethodFilter
    const page = Number(params.get('page'))
    const users = await listUsers({
      query: params.get('query') ?? '',
      plan: PLANS.includes(plan) ? plan : 'all',
      method: METHODS.includes(method) ? method : 'all',
      page: Number.isFinite(page) && page >= 1 && page <= 100_000 ? page : 1,
    })
    return NextResponse.json(users, { headers: { 'Cache-Control': 'no-store' } })
  })
}
