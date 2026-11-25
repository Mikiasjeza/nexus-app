/**
 * GET /api/jobs/alerts/unsubscribe?token=...
 * One-click unsubscribe from a job alert email. No sign-in needed: the link
 * itself is the proof. Turns the alert off and shows a short page.
 */

import { unsubscribe } from '@/lib/jobs/alerts'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Nexus</title><style>body{font-family:system-ui,sans-serif;background:#000;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}main{max-width:28rem}a{color:#fff}</style></head><body><main><h1>${title}</h1><p>${body}</p><p><a href="/settings/career">Manage alerts in Career settings</a></p></main></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } }
  )

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`jobs:unsub:${ip}`, { maxRequests: 20, windowMs: 60_000 }).allowed) {
    return page('Slow down', 'Too many requests. Try again in a minute.', 429)
  }
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const ok = await unsubscribe(token).catch(() => false)
  return ok
    ? page('Unsubscribed', 'You won’t get emails from this job alert any more.')
    : page(
        'Link expired',
        'This unsubscribe link is no longer valid. You can turn alerts off in Career settings.',
        400
      )
}
