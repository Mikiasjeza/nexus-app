/**
 * Shared plumbing for the assessment API routes: who is asking, which
 * attempt they may touch, and one place that turns errors into responses.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId, isGuestRequest } from '@/lib/auth/session'
import { dbErrorResponse } from '@/lib/db-error'
import { rateLimit } from '@/lib/utils/rateLimit'
import { prismaAssessmentStore } from './prisma-store'
import { getAssessment } from './catalog'
import { usesExternalRunner } from './engine'
import { AssessmentError, gradeWithAI, type Deps } from './service'
import { ConflictError, type AttemptRecord } from './store'
import { TransitionError } from './state'

export const assessmentDeps = (): Deps => ({ store: prismaAssessmentStore, grade: gradeWithAI })

export const GUEST_MESSAGE =
  'Sign in to take an assessment for a credential. Practice rounds work without an account.'

/** The signed-in user's id. Guest sessions never reach the database here. */
export async function requireUser(message = GUEST_MESSAGE): Promise<string> {
  if (await isGuestRequest()) throw new AssessmentError(message, 401)
  const userId = await getSessionUserId()
  if (!userId)
    throw new AssessmentError(message === GUEST_MESSAGE ? 'Sign in to continue.' : message, 401)
  return userId
}

export const METERED_PRACTICE_MESSAGE =
  'Sign in to run code in this practice round. It runs on a separate, metered server.'

/**
 * Practice runs on the external runner cost money per call, so they need an
 * account and get their own per-user limit on top of the per-address one.
 */
export async function guardMeteredPractice(slug: string, maxPerMinute: number): Promise<void> {
  const def = getAssessment(slug)
  if (!def || !(await usesExternalRunner(def))) return
  const userId = await requireUser(METERED_PRACTICE_MESSAGE)
  limit(`practice-metered:${userId}`, maxPerMinute)
}

/** The attempt, if it belongs to this user. Anyone else gets a plain 404. */
export async function ownedAttempt(deps: Deps, id: string, userId: string): Promise<AttemptRecord> {
  const attempt = await deps.store.getAttempt(id)
  if (!attempt || attempt.userId !== userId) throw new AssessmentError('Attempt not found', 404)
  return attempt
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** The reviewer's email, if the signed-in user is listed in ADMIN_EMAILS. */
export async function requireReviewer(): Promise<string> {
  const userId = await requireUser()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  const email = user?.email.toLowerCase()
  if (!email || !adminEmails().includes(email)) throw new AssessmentError('Not found', 404)
  return email
}

export function limit(key: string, maxRequests: number, windowMs = 60_000) {
  const rl = rateLimit(key, { maxRequests, windowMs })
  if (!rl.allowed) throw new AssessmentError('Too many requests. Wait a moment and try again.', 429)
}

/** Client address for rate limits on unauthenticated routes. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'local'
}

export async function readJson(
  request: Request,
  maxBytes = 200_000
): Promise<Record<string, unknown>> {
  const text = await request.text()
  if (text.length > maxBytes) throw new AssessmentError('That is too large to save.', 413)
  try {
    const value = text ? JSON.parse(text) : {}
    return value && typeof value === 'object' ? value : {}
  } catch {
    throw new AssessmentError('Invalid request body')
  }
}

export async function handle(label: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof AssessmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof ConflictError || error instanceof TransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : ''
    if (code === 'P2021') {
      return NextResponse.json(
        { error: 'Assessments are not set up on this server yet.' },
        { status: 503 }
      )
    }
    const dbErr = dbErrorResponse(error)
    if (dbErr) return dbErr
    console.error(`${label}:`, error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
