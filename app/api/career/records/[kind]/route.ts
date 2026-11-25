/**
 * POST /api/career/records/[kind]   add education, experience or a certification
 * kind: 'education' | 'experience' | 'certifications'
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { ProfileError, RECORD_KINDS, createRecord, type RecordKind } from '@/lib/career/profile'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account first.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { kind } = await params
    if (!(RECORD_KINDS as readonly string[]).includes(kind)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!rateLimit(`career:records:${userId}`, { maxRequests: 60, windowMs: 60_000 }).allowed) {
      return NextResponse.json({ error: 'Too many changes. Slow down a little.' }, { status: 429 })
    }
    const record = await createRecord(
      userId,
      kind as RecordKind,
      await request.json().catch(() => ({}))
    )
    return NextResponse.json({ record })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? 'Invalid' }, { status: 400 })
    }
    if (e instanceof ProfileError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbErrorResponse(e) ?? NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}
