/**
 * POST /api/career/resume   (multipart: file, consent=yes)
 * Reads a resume in memory and returns an AI-extracted draft to review.
 * The file is not stored and nothing is saved to the profile here.
 */

import { NextResponse } from 'next/server'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import {
  MAX_RESUME_BYTES,
  ResumeError,
  checkResumeFile,
  extractResume,
  resumeText,
} from '@/lib/career/resume'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    if (await isGuestRequest()) {
      return NextResponse.json({ error: 'Create an account first.' }, { status: 401 })
    }
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!rateLimit(`career:resume:${userId}`, { maxRequests: 5, windowMs: 60 * 60_000 }).allowed) {
      return NextResponse.json(
        { error: 'You can import up to 5 resumes an hour. Try again later.' },
        { status: 429 }
      )
    }
    const length = Number(request.headers.get('content-length') ?? 0)
    if (length > MAX_RESUME_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'Resumes can be up to 5 MB.' }, { status: 413 })
    }

    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    if (form?.get('consent') !== 'yes') {
      return NextResponse.json(
        { error: 'Please agree to have the AI read your resume first.' },
        { status: 400 }
      )
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = checkResumeFile(file.name, bytes)
    const draft = await extractResume(await resumeText(bytes, type))
    return NextResponse.json({ draft })
  } catch (e) {
    if (e instanceof ResumeError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('Resume import error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not read that resume.' }, { status: 500 })
  }
}
