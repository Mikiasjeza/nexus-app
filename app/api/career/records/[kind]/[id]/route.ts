/**
 * PATCH  /api/career/records/[kind]/[id]   edit one of your records
 * DELETE /api/career/records/[kind]/[id]   delete it
 * Only the owner's rows can be changed; anything else is "Not found".
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import {
  ProfileError,
  RECORD_KINDS,
  deleteRecord,
  updateRecord,
  type RecordKind,
} from '@/lib/career/profile'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ kind: string; id: string }> }

async function resolve(ctx: Ctx) {
  if (await isGuestRequest()) return { error: 401 as const }
  const userId = await getSessionUserId()
  if (!userId) return { error: 401 as const }
  const { kind, id } = await ctx.params
  if (!(RECORD_KINDS as readonly string[]).includes(kind)) return { error: 404 as const }
  if (!rateLimit(`career:records:${userId}`, { maxRequests: 60, windowMs: 60_000 }).allowed) {
    return { error: 429 as const }
  }
  return { userId, kind: kind as RecordKind, id }
}

function fail(e: unknown) {
  if (e instanceof ZodError) {
    return NextResponse.json({ error: e.errors[0]?.message ?? 'Invalid' }, { status: 400 })
  }
  if (e instanceof ProfileError) {
    return NextResponse.json({ error: e.message }, { status: e.status })
  }
  return dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not save' }, { status: 500 })
}

const MESSAGES = { 401: 'Not authenticated', 404: 'Not found', 429: 'Too many changes' }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const r = await resolve(ctx)
    if ('error' in r) return NextResponse.json({ error: MESSAGES[r.error!] }, { status: r.error })
    await updateRecord(r.userId, r.kind, r.id, await request.json().catch(() => ({})))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const r = await resolve(ctx)
    if ('error' in r) return NextResponse.json({ error: MESSAGES[r.error!] }, { status: r.error })
    await deleteRecord(r.userId, r.kind, r.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}
