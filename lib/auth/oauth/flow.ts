/**
 * The two halves of a provider sign-in: sending the person to the provider,
 * and turning the code they come back with into a checked profile.
 *
 * Authorization-code flow throughout. The code is swapped for tokens
 * server-side with the client secret, the tokens are read once and thrown
 * away, and nothing from the provider is stored except its id for the person.
 */

import { createHash, randomBytes } from 'crypto'
import { getAppUrl } from '@/lib/config/env'
import { OAuthError } from './id-token'
import {
  providerCredentials,
  type ProviderProfile,
  type SignInProvider,
  type TokenSet,
} from './providers'

const TOKEN_TIMEOUT_MS = 10_000

export type OAuthMode = 'signin' | 'connect'

/** What must survive the round trip to the provider. Kept in an HTTP-only cookie. */
export interface OAuthFlow {
  provider: string
  state: string
  nonce: string | null
  verifier: string | null
  mode: OAuthMode
  /** Connect only: the account that started it. The callback also needs the live session to match. */
  userId: string | null
  /** Where to land after signing in; always a path on this site. */
  next: string | null
}

/** The address the provider sends people back to. It must be registered with the provider exactly. */
export function redirectUri(provider: SignInProvider): string {
  return new URL(`/api/auth/oauth/${provider.id}/callback`, getAppUrl()).toString()
}

const randomToken = () => randomBytes(32).toString('base64url')

export interface StartOptions {
  mode: OAuthMode
  userId?: string | null
  next?: string | null
}

/** A fresh flow and the provider address to send the person to. */
export function startAuthorization(
  provider: SignInProvider,
  options: StartOptions
): { url: string; flow: OAuthFlow } {
  const credentials = providerCredentials(provider)
  if (!credentials)
    throw new OAuthError('not_configured', `${provider.label} sign-in is not set up`)

  const flow: OAuthFlow = {
    provider: provider.id,
    state: randomToken(),
    nonce: provider.nonce ? randomToken() : null,
    verifier: provider.pkce ? randomToken() : null,
    mode: options.mode,
    userId: options.mode === 'connect' ? (options.userId ?? null) : null,
    next: options.next ?? null,
  }

  const url = new URL(provider.authorizationEndpoint())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', credentials.clientId)
  url.searchParams.set('redirect_uri', redirectUri(provider))
  url.searchParams.set('scope', provider.scope)
  url.searchParams.set('state', flow.state)
  if (flow.nonce) url.searchParams.set('nonce', flow.nonce)
  if (flow.verifier) {
    const challenge = createHash('sha256').update(flow.verifier).digest('base64url')
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
  }
  // Linking is a deliberate choice of account, so always show the chooser.
  if (flow.mode === 'connect' && provider.accountChooser)
    url.searchParams.set('prompt', 'select_account')

  return { url: url.toString(), flow }
}

async function exchangeCode(
  provider: SignInProvider,
  credentials: { clientId: string; clientSecret: string },
  code: string,
  verifier: string | null
): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(provider),
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  })
  if (verifier) body.set('code_verifier', verifier)

  const response = await fetch(provider.tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    cache: 'no-store',
  })
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok || !data || data.error) {
    // The provider's own error text (a wrong redirect address, an expired code)
    // is what makes a setup mistake findable. It never contains a token.
    const detail = [data?.error, data?.error_description]
      .filter((part): part is string => typeof part === 'string')
      .join(': ')
      .slice(0, 300)
    throw new OAuthError(
      'token_exchange_failed',
      `${provider.label} token endpoint answered ${response.status}${detail ? ` (${detail})` : ''}`
    )
  }
  return {
    idToken: typeof data.id_token === 'string' ? data.id_token : null,
    accessToken: typeof data.access_token === 'string' ? data.access_token : null,
  }
}

/** Swap the code for tokens and read the person's checked profile from them. */
export async function completeAuthorization(
  provider: SignInProvider,
  flow: OAuthFlow,
  code: string,
  now: number = Date.now()
): Promise<ProviderProfile> {
  const credentials = providerCredentials(provider)
  if (!credentials)
    throw new OAuthError('not_configured', `${provider.label} sign-in is not set up`)
  const tokens = await exchangeCode(provider, credentials, code, flow.verifier)
  return provider.readProfile(tokens, { clientId: credentials.clientId, nonce: flow.nonce, now })
}
