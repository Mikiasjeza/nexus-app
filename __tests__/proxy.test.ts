/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

// Tests run in guest-preview mode, which deliberately lets every page through.
jest.mock('@/lib/config/env', () => ({ env: { isGuestMode: false } }))

const visit = (path: string, session = false) =>
  proxy(
    new NextRequest(`https://nexus.example${path}`, {
      headers: session ? { cookie: 'nexus_session=token' } : {},
    })
  )

const redirectsToLogin = (response: Response) =>
  response.status === 307 && (response.headers.get('location') ?? '').includes('/auth/login')

describe('proxy', () => {
  it('lets signed-out visitors load the pricing page and its plan data', () => {
    expect(redirectsToLogin(visit('/pricing'))).toBe(false)
    expect(redirectsToLogin(visit('/api/billing/plans'))).toBe(false)
  })

  it('lets Vercel Cron reach the daily billing check, which checks its own secret', () => {
    expect(redirectsToLogin(visit('/api/cron/billing-check'))).toBe(false)
  })

  it('keeps account billing routes and private assessment pages behind a login', () => {
    expect(redirectsToLogin(visit('/api/billing/summary'))).toBe(true)
    expect(redirectsToLogin(visit('/api/stripe/checkout'))).toBe(true)
    expect(redirectsToLogin(visit('/assessments/report/att_1'))).toBe(true)
    expect(redirectsToLogin(visit('/assessments/result/att_1'))).toBe(true)
    expect(redirectsToLogin(visit('/settings'))).toBe(true)
  })

  it('still serves public assessment pages and lets signed-in people through', () => {
    expect(redirectsToLogin(visit('/assessments/python'))).toBe(false)
    expect(redirectsToLogin(visit('/assessments/report/att_1', true))).toBe(false)
  })
})
