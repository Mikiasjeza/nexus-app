/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/oauth/[provider]/callback/route'
import { OAuthError } from '@/lib/auth/oauth/id-token'

jest.mock('@/lib/config/env', () => ({ getAppUrl: () => 'https://app.test' }))
jest.mock('@sentry/nextjs', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }))
jest.mock('@/lib/utils/rateLimit', () => ({ rateLimit: jest.fn(() => ({ allowed: true })) }))
jest.mock('@/lib/auth/oauth-state', () => ({ takeOAuthFlow: jest.fn() }))
jest.mock('@/lib/auth/oauth/flow', () => ({ completeAuthorization: jest.fn() }))
jest.mock('@/lib/auth/oauth/account', () => ({
  signInWithProvider: jest.fn(),
  connectProvider: jest.fn(),
}))
jest.mock('@/lib/auth/session', () => ({
  createSession: jest.fn(),
  setSessionCookie: jest.fn(),
  getSessionUserId: jest.fn(),
  clearGuestPreviewCookie: jest.fn(),
}))

const { takeOAuthFlow } = jest.requireMock('@/lib/auth/oauth-state') as { takeOAuthFlow: jest.Mock }
const { completeAuthorization } = jest.requireMock('@/lib/auth/oauth/flow') as {
  completeAuthorization: jest.Mock
}
const account = jest.requireMock('@/lib/auth/oauth/account') as {
  signInWithProvider: jest.Mock
  connectProvider: jest.Mock
}
const session = jest.requireMock('@/lib/auth/session') as {
  createSession: jest.Mock
  setSessionCookie: jest.Mock
  getSessionUserId: jest.Mock
  clearGuestPreviewCookie: jest.Mock
}
const { rateLimit } = jest.requireMock('@/lib/utils/rateLimit') as { rateLimit: jest.Mock }

const PROFILE = { providerId: 'sub-1', email: 'ada@example.com', emailVerified: true, name: 'Ada' }

const flow = (extra: Record<string, unknown> = {}) => ({
  provider: 'google',
  state: 'state-1',
  nonce: 'nonce-1',
  verifier: 'verifier-1',
  mode: 'signin',
  userId: null,
  next: null,
  ...extra,
})

function callback(query = 'code=abc&state=state-1', provider = 'google') {
  return GET(new NextRequest(`https://app.test/api/auth/oauth/${provider}/callback?${query}`), {
    params: Promise.resolve({ provider }),
  })
}

const location = (res: Response) => new URL(res.headers.get('location') ?? '')

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_CLIENT_ID = 'google-id'
  process.env.GOOGLE_CLIENT_SECRET = 'google-secret'
  delete process.env.LINKEDIN_CLIENT_ID
  delete process.env.LINKEDIN_CLIENT_SECRET
  rateLimit.mockReturnValue({ allowed: true })
  takeOAuthFlow.mockResolvedValue(flow())
  completeAuthorization.mockResolvedValue(PROFILE)
  account.signInWithProvider.mockResolvedValue({
    kind: 'signed_in',
    userId: 'user-1',
    isNew: false,
    onboardingComplete: true,
  })
  account.connectProvider.mockResolvedValue({ kind: 'connected' })
  session.getSessionUserId.mockResolvedValue(null)
  session.createSession.mockResolvedValue('session-token')
})

describe('provider sign-in callback', () => {
  it('signs in and lands on the dashboard', async () => {
    const res = await callback()
    expect(completeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'google' }),
      expect.objectContaining({ state: 'state-1' }),
      'abc'
    )
    expect(account.signInWithProvider).toHaveBeenCalledWith('google', PROFILE)
    expect(session.createSession).toHaveBeenCalledWith('user-1')
    expect(session.setSessionCookie).toHaveBeenCalledWith('session-token')
    expect(session.clearGuestPreviewCookie).toHaveBeenCalled()
    expect(location(res).pathname).toBe('/dashboard')
  })

  it('returns to the page the person was heading for', async () => {
    takeOAuthFlow.mockResolvedValue(flow({ next: '/assessments/attempt/a1' }))
    expect(location(await callback()).pathname).toBe('/assessments/attempt/a1')
  })

  it('never follows a tampered "next" off the site', async () => {
    takeOAuthFlow.mockResolvedValue(flow({ next: '//evil.example/x' }))
    const target = location(await callback())
    expect(target.origin).toBe('https://app.test')
    expect(target.pathname).toBe('/dashboard')
  })

  it('sends a new person to onboarding', async () => {
    account.signInWithProvider.mockResolvedValue({
      kind: 'signed_in',
      userId: 'new-user',
      isNew: true,
      onboardingComplete: false,
    })
    takeOAuthFlow.mockResolvedValue(flow({ next: '/skills' }))
    expect(location(await callback()).pathname).toBe('/onboarding')
  })

  it.each([
    ['no saved sign-in in this browser', null, 'code=abc&state=state-1'],
    ['a state that does not match', flow(), 'code=abc&state=other'],
    ['no state at all', flow(), 'code=abc'],
    [
      'a sign-in that was started for another provider',
      flow({ provider: 'linkedin' }),
      'code=abc&state=state-1',
    ],
  ])('rejects %s without exchanging the code', async (_name, saved, query) => {
    takeOAuthFlow.mockResolvedValue(saved)
    const res = await callback(query)
    expect(location(res).pathname).toBe('/auth/login')
    expect(location(res).searchParams.get('error')).toBe('invalid_state')
    expect(completeAuthorization).not.toHaveBeenCalled()
    expect(session.createSession).not.toHaveBeenCalled()
  })

  it('says so when the person cancelled at the provider', async () => {
    const res = await callback('error=access_denied&state=state-1')
    expect(location(res).searchParams.get('error')).toBe('oauth_cancelled')
    expect(location(res).searchParams.get('provider')).toBe('google')
    expect(completeAuthorization).not.toHaveBeenCalled()
  })

  it.each([
    ['account_exists', 'account_exists'],
    ['email_unverified', 'email_unverified'],
  ])('passes on a refusal (%s) and creates no session', async (reason, code) => {
    account.signInWithProvider.mockResolvedValue({ kind: 'refused', reason })
    const res = await callback()
    expect(location(res).pathname).toBe('/auth/login')
    expect(location(res).searchParams.get('error')).toBe(code)
    expect(session.createSession).not.toHaveBeenCalled()
    expect(session.setSessionCookie).not.toHaveBeenCalled()
  })

  it('fails closed when the provider’s answer does not check out', async () => {
    completeAuthorization.mockRejectedValue(new OAuthError('bad_nonce', 'wrong sign-in'))
    const res = await callback()
    expect(location(res).searchParams.get('error')).toBe('oauth_failed')
    expect(account.signInWithProvider).not.toHaveBeenCalled()
    expect(session.createSession).not.toHaveBeenCalled()
  })

  it('refuses a provider that is unknown or switched off', async () => {
    expect(location(await callback(undefined, 'github')).searchParams.get('error')).toBe(
      'oauth_unavailable'
    )
    expect(location(await callback(undefined, 'linkedin')).searchParams.get('error')).toBe(
      'oauth_unavailable'
    )
    expect(completeAuthorization).not.toHaveBeenCalled()
  })

  it('stops when there are too many attempts', async () => {
    rateLimit.mockReturnValue({ allowed: false })
    const res = await callback()
    expect(location(res).searchParams.get('error')).toBe('oauth_rate_limited')
    expect(completeAuthorization).not.toHaveBeenCalled()
  })
})

describe('linking a provider from Settings', () => {
  beforeEach(() => {
    takeOAuthFlow.mockResolvedValue(flow({ mode: 'connect', userId: 'user-1' }))
    session.getSessionUserId.mockResolvedValue('user-1')
  })

  it('links to the signed-in account and never starts a new session', async () => {
    const res = await callback()
    expect(account.connectProvider).toHaveBeenCalledWith('user-1', 'google', PROFILE)
    expect(account.signInWithProvider).not.toHaveBeenCalled()
    expect(session.createSession).not.toHaveBeenCalled()
    expect(location(res).pathname).toBe('/settings')
    expect(location(res).searchParams.get('connected')).toBe('google')
  })

  it('takes the account from the session, not from the cookie', async () => {
    // A cookie edited to name someone else's account must link nothing.
    takeOAuthFlow.mockResolvedValue(flow({ mode: 'connect', userId: 'victim' }))
    const res = await callback()
    expect(account.connectProvider).not.toHaveBeenCalled()
    expect(location(res).pathname).toBe('/settings')
    expect(location(res).searchParams.get('connect_error')).toBe('session_changed')
  })

  it('links nothing when nobody is signed in any more', async () => {
    session.getSessionUserId.mockResolvedValue(null)
    const res = await callback()
    expect(account.connectProvider).not.toHaveBeenCalled()
    expect(location(res).searchParams.get('connect_error')).toBe('session_changed')
  })

  it('reports a provider account that belongs to someone else', async () => {
    account.connectProvider.mockResolvedValue({ kind: 'refused', reason: 'already_linked' })
    const res = await callback()
    expect(location(res).searchParams.get('connect_error')).toBe('already_linked')
    expect(location(res).searchParams.get('provider')).toBe('google')
  })
})
