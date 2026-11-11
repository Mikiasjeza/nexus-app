/**
 * @jest-environment node
 */

import { createHash } from 'crypto'
import {
  assertIdToken,
  cleanName,
  decodeIdToken,
  normalizeEmail,
  OAuthError,
} from '@/lib/auth/oauth/id-token'
import {
  configuredProviders,
  getSignInProvider,
  MICROSOFT_PERSONAL_TENANT,
  providerSummaries,
} from '@/lib/auth/oauth/providers'
import { completeAuthorization, redirectUri, startAuthorization } from '@/lib/auth/oauth/flow'
import { connectErrorMessage, providerLabel, signInErrorMessage } from '@/lib/auth/oauth/labels'
import { safeNextPath } from '@/lib/auth/safe-redirect'

jest.mock('@/lib/config/env', () => ({
  // A trailing slash, as on the live site: addresses must still come out clean.
  getAppUrl: () => 'https://app.test/',
}))

const NOW = Date.parse('2026-11-11T12:00:00Z')
const SECONDS = Math.floor(NOW / 1000)
const WORK_TENANT = '11111111-2222-3333-4444-555555555555'

/** An unsigned token: only its claims are read (it comes straight from the provider over TLS). */
function idToken(claims: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'RS256' })}.${part(claims)}.signature`
}

const googleClaims = (extra: Record<string, unknown> = {}) => ({
  iss: 'https://accounts.google.com',
  aud: 'google-id',
  azp: 'google-id',
  sub: '1234567890',
  exp: SECONDS + 3600,
  iat: SECONDS,
  nonce: 'nonce-1',
  email: 'Ada@Example.com',
  email_verified: true,
  name: 'Ada Lovelace',
  ...extra,
})

const microsoftClaims = (tid: string, extra: Record<string, unknown> = {}) => ({
  iss: `https://login.microsoftonline.com/${tid}/v2.0`,
  aud: 'microsoft-id',
  sub: 'pairwise-sub',
  tid,
  exp: SECONDS + 3600,
  nonce: 'nonce-1',
  email: 'ada@contoso.com',
  name: 'Ada Lovelace',
  ...extra,
})

const context = (clientId: string) => ({ clientId, nonce: 'nonce-1', now: NOW })

const google = getSignInProvider('google')!
const microsoft = getSignInProvider('microsoft')!
const linkedin = getSignInProvider('linkedin')!

const PROVIDER_ENV = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_TENANT',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
]

const realFetch = global.fetch

beforeEach(() => {
  for (const name of PROVIDER_ENV) delete process.env[name]
  process.env.GOOGLE_CLIENT_ID = 'google-id'
  process.env.GOOGLE_CLIENT_SECRET = 'google-secret'
})

afterEach(() => {
  global.fetch = realFetch
})

describe('which providers are on', () => {
  it('lists only providers with both an id and a secret, and never the secret', () => {
    process.env.LINKEDIN_CLIENT_ID = 'linkedin-id' // no secret: stays off
    expect(configuredProviders().map((p) => p.id)).toEqual(['google'])
    expect(providerSummaries()).toEqual([{ id: 'google', label: 'Google' }])
  })

  it('does not know GitHub as a sign-in provider', () => {
    expect(getSignInProvider('github')).toBeNull()
    expect(getSignInProvider('constructor')).toBeNull()
  })
})

describe('ID token checks', () => {
  const checks = {
    issuer: (iss: string) => iss === 'https://accounts.google.com',
    clientId: 'google-id',
    nonce: 'nonce-1',
    now: NOW,
  }

  it('accepts a current token for this app and this sign-in', () => {
    expect(assertIdToken(googleClaims(), checks).sub).toBe('1234567890')
  })

  it.each([
    ['another issuer', { iss: 'https://evil.example' }, 'bad_issuer'],
    ['another app', { aud: 'someone-else', azp: 'someone-else' }, 'bad_audience'],
    [
      'a second audience without us as the authorised party',
      { aud: ['google-id', 'x'], azp: 'x' },
      'bad_audience',
    ],
    ['an expired token', { exp: SECONDS - 600 }, 'expired_id_token'],
    ['a token dated in the future', { iat: SECONDS + 600 }, 'bad_id_token'],
    ['another sign-in (nonce)', { nonce: 'nonce-2' }, 'bad_nonce'],
    ['no nonce at all', { nonce: undefined }, 'bad_nonce'],
    ['no subject', { sub: '' }, 'bad_id_token'],
  ])('rejects %s', (_name, change, code) => {
    expect.assertions(2)
    try {
      assertIdToken(googleClaims(change), checks)
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthError)
      expect((error as OAuthError).code).toBe(code)
    }
  })

  it('refuses anything that is not a three-part token', () => {
    expect(() => decodeIdToken('not-a-token')).toThrow(OAuthError)
    expect(() => decodeIdToken('a.!!!.c')).toThrow(OAuthError)
  })
})

describe('Google profile', () => {
  it('takes the id, the verified email in lower case, and the name', async () => {
    const profile = await google.readProfile(
      { idToken: idToken(googleClaims()), accessToken: null },
      context('google-id')
    )
    expect(profile).toEqual({
      providerId: '1234567890',
      email: 'ada@example.com',
      emailVerified: true,
      // Verified, but Google doesn't run example.com's mailboxes.
      emailAuthoritative: false,
      name: 'Ada Lovelace',
    })
  })

  it.each([
    ['a Gmail address', { email: 'ada@gmail.com' }, true],
    ['an address on its own Workspace domain', { email: 'ada@acme.com', hd: 'acme.com' }, true],
    ['a Workspace account on another domain', { email: 'ada@other.com', hd: 'acme.com' }, false],
    ['an unverified Gmail address', { email: 'ada@gmail.com', email_verified: false }, false],
    ['a look-alike domain', { email: 'ada@gmail.com.evil.example' }, false],
  ])('knows when Google runs the mailbox: %s', async (_name, change, expected) => {
    const profile = await google.readProfile(
      { idToken: idToken(googleClaims(change)), accessToken: null },
      context('google-id')
    )
    expect(profile.emailAuthoritative).toBe(expected)
  })

  it('does not treat an unverified address as verified', async () => {
    const profile = await google.readProfile(
      { idToken: idToken(googleClaims({ email_verified: false })), accessToken: null },
      context('google-id')
    )
    expect(profile.emailVerified).toBe(false)
  })

  it('needs an ID token', async () => {
    await expect(
      google.readProfile({ idToken: null, accessToken: 'x' }, context('google-id'))
    ).rejects.toThrow(OAuthError)
  })
})

describe('Microsoft profile', () => {
  const read = (claims: Record<string, unknown>) =>
    microsoft.readProfile({ idToken: idToken(claims), accessToken: null }, context('microsoft-id'))

  it('verifies a personal account and names the person by tenant and subject', async () => {
    const profile = await read(
      microsoftClaims(MICROSOFT_PERSONAL_TENANT, { email: 'ada@outlook.com' })
    )
    expect(profile.providerId).toBe(`${MICROSOFT_PERSONAL_TENANT}:pairwise-sub`)
    expect(profile.emailVerified).toBe(true)
    // A Microsoft account can be opened with anyone's address.
    expect(profile.emailAuthoritative).toBe(false)
  })

  it('does not trust a work tenant’s email claim on its own (it can be set to any address)', async () => {
    const profile = await read(microsoftClaims(WORK_TENANT, { email: 'victim@example.com' }))
    expect(profile.email).toBe('victim@example.com')
    expect(profile.emailVerified).toBe(false)
  })

  it('trusts a work email once Microsoft says the domain owner verified it', async () => {
    const profile = await read(microsoftClaims(WORK_TENANT, { xms_edov: true }))
    expect(profile.emailVerified).toBe(true)
  })

  it('rejects a token whose issuer is not the tenant it names', async () => {
    const claims = microsoftClaims(WORK_TENANT, {
      iss: `https://login.microsoftonline.com/${MICROSOFT_PERSONAL_TENANT}/v2.0`,
    })
    await expect(read(claims)).rejects.toMatchObject({ code: 'bad_issuer' })
  })

  it('keeps to the allowed account type when one is set', async () => {
    process.env.MICROSOFT_TENANT = 'consumers'
    await expect(read(microsoftClaims(WORK_TENANT, { xms_edov: true }))).rejects.toMatchObject({
      code: 'bad_issuer',
    })
    expect(microsoft.authorizationEndpoint()).toBe(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'
    )
  })

  it('falls back to "common" when the tenant setting could change the address', () => {
    process.env.MICROSOFT_TENANT = 'evil.example/path?'
    expect(microsoft.tokenEndpoint()).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    )
  })
})

describe('LinkedIn profile', () => {
  it('reads the profile from LinkedIn with the access token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        sub: 'li-42',
        email: 'Ada@Example.com',
        email_verified: true,
        given_name: 'Ada',
        family_name: 'Lovelace',
      }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
    const profile = await linkedin.readProfile(
      { idToken: null, accessToken: 'li-token' },
      { clientId: 'linkedin-id', nonce: null, now: NOW }
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/userinfo',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer li-token' }),
      })
    )
    expect(profile).toEqual({
      providerId: 'li-42',
      email: 'ada@example.com',
      emailVerified: true,
      emailAuthoritative: false,
      name: 'Ada Lovelace',
    })
  })

  it('fails when LinkedIn refuses the request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    }) as unknown as typeof fetch
    await expect(
      linkedin.readProfile(
        { idToken: null, accessToken: 'bad' },
        { clientId: 'x', nonce: null, now: NOW }
      )
    ).rejects.toMatchObject({ code: 'profile_failed' })
  })
})

describe('starting a sign-in', () => {
  it('sends the person to Google with state, nonce and a PKCE challenge', () => {
    const { url, flow } = startAuthorization(google, { mode: 'signin', next: '/skills' })
    const target = new URL(url)
    expect(`${target.origin}${target.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    )
    const q = target.searchParams
    expect(q.get('response_type')).toBe('code')
    expect(q.get('client_id')).toBe('google-id')
    expect(q.get('redirect_uri')).toBe('https://app.test/api/auth/oauth/google/callback')
    expect(q.get('scope')).toBe('openid email profile')
    expect(q.get('state')).toBe(flow.state)
    expect(q.get('nonce')).toBe(flow.nonce)
    expect(q.get('code_challenge_method')).toBe('S256')
    expect(q.get('code_challenge')).toBe(
      createHash('sha256').update(flow.verifier!).digest('base64url')
    )
    expect(q.get('prompt')).toBeNull()
    // The secret and the verifier never go to the browser's address bar.
    expect(url).not.toContain('google-secret')
    expect(url).not.toContain(flow.verifier!)
    expect(flow).toMatchObject({
      provider: 'google',
      mode: 'signin',
      userId: null,
      next: '/skills',
    })
  })

  it('uses fresh random values every time', () => {
    const a = startAuthorization(google, { mode: 'signin' }).flow
    const b = startAuthorization(google, { mode: 'signin' }).flow
    expect(a.state).not.toBe(b.state)
    expect(a.nonce).not.toBe(b.nonce)
    expect(a.verifier).not.toBe(b.verifier)
    expect(a.state.length).toBeGreaterThanOrEqual(43)
  })

  it('shows the account chooser and remembers the account when linking', () => {
    const { url, flow } = startAuthorization(google, { mode: 'connect', userId: 'user-1' })
    expect(new URL(url).searchParams.get('prompt')).toBe('select_account')
    expect(flow).toMatchObject({ mode: 'connect', userId: 'user-1' })
  })

  it('never carries a user id on a plain sign-in', () => {
    expect(startAuthorization(google, { mode: 'signin', userId: 'user-1' }).flow.userId).toBeNull()
  })

  it('sends LinkedIn no nonce or PKCE, which it does not support', () => {
    process.env.LINKEDIN_CLIENT_ID = 'linkedin-id'
    process.env.LINKEDIN_CLIENT_SECRET = 'linkedin-secret'
    const { url, flow } = startAuthorization(linkedin, { mode: 'signin' })
    const q = new URL(url).searchParams
    expect(q.get('nonce')).toBeNull()
    expect(q.get('code_challenge')).toBeNull()
    expect(flow.nonce).toBeNull()
    expect(flow.verifier).toBeNull()
    expect(q.get('state')).toBe(flow.state)
  })

  it('refuses a provider that is not set up', () => {
    expect(() => startAuthorization(microsoft, { mode: 'signin' })).toThrow(OAuthError)
  })

  it('builds the return address without a doubled slash', () => {
    expect(redirectUri(microsoft)).toBe('https://app.test/api/auth/oauth/microsoft/callback')
  })
})

describe('finishing a sign-in', () => {
  const flow = {
    provider: 'google',
    state: 's',
    nonce: 'nonce-1',
    verifier: 'verifier-1',
    mode: 'signin' as const,
    userId: null,
    next: null,
  }

  it('swaps the code for tokens with the secret and the verifier, then reads the profile', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id_token: idToken(googleClaims()), access_token: 'at' }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const profile = await completeAuthorization(google, flow, 'the-code', NOW)

    const [endpoint, init] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('https://oauth2.googleapis.com/token')
    expect(init.method).toBe('POST')
    const body = init.body as URLSearchParams
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'authorization_code',
      code: 'the-code',
      redirect_uri: 'https://app.test/api/auth/oauth/google/callback',
      client_id: 'google-id',
      client_secret: 'google-secret',
      code_verifier: 'verifier-1',
    })
    expect(profile.providerId).toBe('1234567890')
  })

  it('fails when the token belongs to a different sign-in', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id_token: idToken(googleClaims({ nonce: 'someone-elses' })) }),
    }) as unknown as typeof fetch
    await expect(completeAuthorization(google, flow, 'code', NOW)).rejects.toMatchObject({
      code: 'bad_nonce',
    })
  })

  it('reports the provider’s error without leaking the secret', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant', error_description: 'Bad Request' }),
    }) as unknown as typeof fetch
    const failure = await completeAuthorization(google, flow, 'code', NOW).catch((e) => e)
    expect(failure).toBeInstanceOf(OAuthError)
    expect(failure.code).toBe('token_exchange_failed')
    expect(failure.message).toContain('invalid_grant')
    expect(failure.message).not.toContain('google-secret')
  })
})

describe('tidying what providers send', () => {
  it('normalises emails and rejects things that are not one', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com')
    expect(normalizeEmail('not an email')).toBeNull()
    expect(normalizeEmail(42)).toBeNull()
    expect(normalizeEmail(`${'a'.repeat(250)}@example.com`)).toBeNull()
  })

  it('picks the first usable name and strips control characters', () => {
    expect(cleanName(undefined, '  Ada\u0000  Lovelace \n')).toBe('Ada Lovelace')
    expect(cleanName('', '   ')).toBeNull()
    expect(cleanName('x'.repeat(500))).toHaveLength(200)
  })
})

describe('where to go after signing in', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/assessments/attempt/abc?x=1#top', '/assessments/attempt/abc?x=1#top'],
  ])('keeps a path on this site: %s', (value, expected) => {
    expect(safeNextPath(value)).toBe(expected)
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/..//evil.example',
    'javascript:alert(1)',
    'dashboard',
    '/ok\\path',
    '/line\nbreak',
    `/${'a'.repeat(600)}`,
    '',
    null,
    undefined,
  ])('falls back for anything else: %s', (value) => {
    expect(safeNextPath(value as string | null)).toBe('/dashboard')
  })
})

describe('messages', () => {
  it('names the provider, and only a known one', () => {
    expect(providerLabel('linkedin')).toBe('LinkedIn')
    expect(providerLabel('<script>')).toBeNull()
    expect(signInErrorMessage('account_exists', 'google')).toContain('connect Google in Settings')
    expect(signInErrorMessage('account_exists', '<b>x</b>')).not.toContain('<b>')
    expect(signInErrorMessage(null, 'google')).toBe('')
    expect(signInErrorMessage('anything_else', null)).toMatch(/couldn’t sign you in/)
    expect(connectErrorMessage('already_linked', 'microsoft')).toContain('Microsoft account')
  })
})
