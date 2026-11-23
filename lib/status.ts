/**
 * Live checks for the public status page. Each check has a short timeout and
 * never throws; nothing secret (addresses, keys, error text) is returned.
 */

import { prisma } from '@/lib/db'

export type CheckState = 'up' | 'down' | 'off'

export type StatusCheck = {
  name: string
  state: CheckState
  detail: string
}

const TIMEOUT_MS = 4000

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
  ])
}

async function database(): Promise<StatusCheck> {
  const name = 'Accounts and data'
  try {
    const start = Date.now()
    await withTimeout(prisma.$queryRaw`SELECT 1`)
    return { name, state: 'up', detail: `Responding in ${Date.now() - start} ms` }
  } catch {
    return { name, state: 'down', detail: 'Not responding' }
  }
}

async function codeRunner(): Promise<StatusCheck> {
  const name = 'Coding assessments'
  const base = process.env.JUDGE0_URL?.replace(/\/$/, '')
  if (!base && !process.env.JUDGE0_RAPIDAPI_KEY) {
    return { name, state: 'off', detail: 'Not switched on yet' }
  }
  if (!base) return { name, state: 'up', detail: 'Using a hosted runner' }
  try {
    const res = await fetch(`${base}/about`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    return res.ok
      ? { name, state: 'up', detail: 'Running' }
      : { name, state: 'down', detail: 'Not responding' }
  } catch {
    return { name, state: 'down', detail: 'Not responding' }
  }
}

function configured(name: string, on: boolean, detail: string): StatusCheck {
  return on ? { name, state: 'up', detail } : { name, state: 'off', detail: 'Not switched on yet' }
}

export async function statusChecks(): Promise<StatusCheck[]> {
  const [db, runner] = await Promise.all([database(), codeRunner()])
  return [
    { name: 'Website', state: 'up', detail: 'Serving pages' },
    db,
    runner,
    configured(
      'Payments',
      Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      'Handled by Stripe'
    ),
    configured('Email', Boolean(process.env.RESEND_API_KEY), 'Sending'),
  ]
}

/** The headline: down if any live check is down, otherwise up. */
export function overall(checks: StatusCheck[]): 'up' | 'down' {
  return checks.some((c) => c.state === 'down') ? 'down' : 'up'
}
