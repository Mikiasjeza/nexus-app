/**
 * PATCH  /api/jobs/tracker/[id]   change status, notes or next step
 * DELETE /api/jobs/tracker/[id]   remove it
 */

import { NextResponse } from 'next/server'
import { deleteTracked, updateTracked } from '@/lib/jobs/tracker'
import { body, failure, signedIn } from '@/lib/jobs/http'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const userId = await signedIn('jobs:tracker')
    if (userId instanceof NextResponse) return userId
    await updateTracked(userId, (await ctx.params).id, await body(request))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return failure(e)
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const userId = await signedIn('jobs:tracker')
    if (userId instanceof NextResponse) return userId
    await deleteTracked(userId, (await ctx.params).id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return failure(e)
  }
}
