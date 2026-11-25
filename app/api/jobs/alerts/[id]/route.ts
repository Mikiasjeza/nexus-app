/**
 * PATCH  /api/jobs/alerts/[id]   change filters, frequency, or turn it on/off
 * DELETE /api/jobs/alerts/[id]   delete it
 */

import { NextResponse } from 'next/server'
import { deleteAlert, updateAlert } from '@/lib/jobs/alerts'
import { body, failure, signedIn } from '@/lib/jobs/http'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const userId = await signedIn('jobs:alerts')
    if (userId instanceof NextResponse) return userId
    await updateAlert(userId, (await ctx.params).id, await body(request))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return failure(e)
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const userId = await signedIn('jobs:alerts')
    if (userId instanceof NextResponse) return userId
    await deleteAlert(userId, (await ctx.params).id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return failure(e)
  }
}
