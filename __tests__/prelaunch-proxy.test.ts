/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

jest.mock('@/lib/config/env', () => ({ env: { isGuestMode: false } }))

const ENV = { ...process.env }
beforeEach(() => {
  process.env.PRELAUNCH_MODE = 'true'
})
afterEach(() => {
  process.env = { ...ENV }
})

const visit = (path: string, cookie = '', method = 'GET') =>
  proxy(
    new NextRequest(`https://nexus.example${path}`, {
      method,
      headers: cookie ? { cookie } : {},
    })
  )

const location = (r: Response) => r.headers.get('location') ?? ''
const passesThrough = (r: Response) => r.status === 200 && !location(r)
const toComingSoon = (r: Response) => r.status === 307 && location(r).endsWith('/coming-soon')

describe('proxy in pre-launch mode', () => {
  it('shows the Coming Soon page at the homepage', () => {
    const r = visit('/')
    expect(r.headers.get('x-middleware-rewrite')).toContain('/coming-soon')
  })

  it('keeps legal and operational pages public', () => {
    for (const path of ['/coming-soon', '/privacy', '/terms', '/cookies', '/contact', '/status']) {
      expect(passesThrough(visit(path))).toBe(true)
    }
  })

  it('keeps webhooks, cron, health checks and sign-in callbacks working', () => {
    expect(passesThrough(visit('/api/stripe/webhook', '', 'POST'))).toBe(true)
    expect(passesThrough(visit('/api/cron/jobs-sync'))).toBe(true)
    expect(passesThrough(visit('/api/health'))).toBe(true)
    expect(passesThrough(visit('/api/auth/oauth/google/callback?code=x&state=y'))).toBe(true)
    expect(passesThrough(visit('/api/waitlist/join', '', 'POST'))).toBe(true)
    expect(passesThrough(visit('/auth/login'))).toBe(true)
  })

  it('sends signed-out visitors from app pages to Coming Soon', () => {
    for (const path of ['/dashboard', '/assessments', '/jobs', '/pricing', '/admin']) {
      expect(toComingSoon(visit(path))).toBe(true)
    }
  })

  it('refuses app APIs for signed-out visitors', async () => {
    const r = visit('/api/billing/plans')
    expect(r.status).toBe(403)
    expect((await r.json()).error).toMatch(/isn.t open yet/)
  })

  it('ignores the guest preview cookie, so it is not a way in', () => {
    expect(toComingSoon(visit('/dashboard', 'nexus_guest_preview=true'))).toBe(true)
  })

  it('passes signed-in requests on; the server then checks who they are', () => {
    // The session check (admin, allowlist or paying) runs in getSessionUserId
    // and the root layout, not here, because the proxy cannot read the database.
    expect(passesThrough(visit('/dashboard', 'nexus_session=token'))).toBe(true)
  })

  it('behaves as before when pre-launch mode is off', () => {
    process.env.PRELAUNCH_MODE = 'false'
    expect(location(visit('/dashboard'))).toContain('/auth/login')
    expect(visit('/').headers.get('x-middleware-rewrite')).toBeNull()
  })
})
