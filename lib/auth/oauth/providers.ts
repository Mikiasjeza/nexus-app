/**
 * Sign-in providers: "Continue with Google / Microsoft / LinkedIn".
 *
 * Each one switches on only when its client id and secret are set, so the
 * sign-in page never shows a button that can't work. GitHub is deliberately
 * not here: it can be connected in Settings to prove repository authorship
 * (lib/integrations/github.ts), but it is not a way to sign in.
 *
 * Endpoints are fixed rather than discovered at runtime. They match each
 * provider's published /.well-known/openid-configuration (checked Nov 2026).
 */

import {
  assertIdToken,
  cleanName,
  decodeIdToken,
  isTrue,
  normalizeEmail,
  OAuthError,
} from './id-token'
import { PROVIDER_LABELS, type SignInProviderId } from './labels'

export type { SignInProviderId }

/** What a provider told us about the person who just signed in. */
export interface ProviderProfile {
  /** The provider's permanent id for this person. Accounts are matched on this and nothing else. */
  providerId: string
  /** Lower-cased email, or null when the provider gave none. */
  email: string | null
  /** True only when the provider itself vouches that the person controls the address. */
  emailVerified: boolean
  /**
   * True only when the provider runs the mailbox itself: a Gmail address, or an
   * address on the person's own Google Workspace domain. Then the sign-in proves
   * ownership as well as the emailed link would (see lib/auth/oauth/account.ts).
   */
  emailAuthoritative: boolean
  name: string | null
}

export interface TokenSet {
  idToken: string | null
  accessToken: string | null
}

export interface ProfileContext {
  clientId: string
  /** The one-time value sent with the request, when the provider echoes one back. */
  nonce: string | null
  now: number
}

export interface SignInProvider {
  id: SignInProviderId
  /** Shown on buttons: "Continue with {label}". */
  label: string
  clientIdEnv: string
  clientSecretEnv: string
  authorizationEndpoint(): string
  tokenEndpoint(): string
  scope: string
  /** Proof Key for Code Exchange: ties the code to the browser that started the sign-in. */
  pkce: boolean
  /** A one-time value the provider echoes back inside the ID token. */
  nonce: boolean
  /** Understands "prompt=select_account", which always shows the account chooser. */
  accountChooser: boolean
  readProfile(tokens: TokenSet, context: ProfileContext): Promise<ProviderProfile>
}

const PROFILE_TIMEOUT_MS = 10_000

function idTokenOf(tokens: TokenSet): string {
  if (!tokens.idToken) throw new OAuthError('no_id_token', 'The provider sent no ID token')
  return tokens.idToken
}

const google: SignInProvider = {
  id: 'google',
  label: PROVIDER_LABELS.google,
  clientIdEnv: 'GOOGLE_CLIENT_ID',
  clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  authorizationEndpoint: () => 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: () => 'https://oauth2.googleapis.com/token',
  scope: 'openid email profile',
  pkce: true,
  nonce: true,
  accountChooser: true,
  async readProfile(tokens, context) {
    const claims = assertIdToken(decodeIdToken(idTokenOf(tokens)), {
      // Google documents both spellings of its issuer.
      issuer: (iss) => iss === 'https://accounts.google.com' || iss === 'accounts.google.com',
      clientId: context.clientId,
      nonce: context.nonce,
      now: context.now,
    })
    const email = normalizeEmail(claims.email)
    const emailVerified = email !== null && isTrue(claims.email_verified)
    // Google's guidance: it is the authority for an address that is a Gmail
    // address, or that belongs to the Workspace domain named in "hd".
    const hd = typeof claims.hd === 'string' ? claims.hd.trim().toLowerCase() : ''
    const emailAuthoritative =
      emailVerified && (email.endsWith('@gmail.com') || (hd !== '' && email.endsWith(`@${hd}`)))
    return {
      providerId: claims.sub,
      email,
      emailVerified,
      emailAuthoritative,
      name: cleanName(claims.name, claims.given_name),
    }
  },
}

/** The tenant every personal Microsoft account (Outlook, Hotmail, Live) lives in. */
export const MICROSOFT_PERSONAL_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad'
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * Which Microsoft accounts may sign in: "common" (work, school and personal;
 * the default), "organizations", "consumers", or one tenant's id. It must
 * agree with the "supported account types" chosen for the app registration.
 */
function microsoftTenant(): string {
  const tenant = (process.env.MICROSOFT_TENANT || 'common').trim().toLowerCase()
  return /^[a-z0-9.-]{1,100}$/.test(tenant) ? tenant : 'common'
}

const microsoft: SignInProvider = {
  id: 'microsoft',
  label: PROVIDER_LABELS.microsoft,
  clientIdEnv: 'MICROSOFT_CLIENT_ID',
  clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
  authorizationEndpoint: () =>
    `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize`,
  tokenEndpoint: () => `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`,
  scope: 'openid email profile',
  pkce: true,
  nonce: true,
  accountChooser: true,
  async readProfile(tokens, context) {
    const claims = assertIdToken(decodeIdToken(idTokenOf(tokens)), {
      // Every tenant is its own issuer, named after the tenant id in the token.
      issuer: (iss, c) =>
        typeof c.tid === 'string' &&
        GUID.test(c.tid) &&
        iss === `https://login.microsoftonline.com/${c.tid}/v2.0`,
      clientId: context.clientId,
      nonce: context.nonce,
      now: context.now,
    })
    const tid = claims.tid as string
    const personal = tid === MICROSOFT_PERSONAL_TENANT

    const allowed = microsoftTenant()
    const wrongTenant =
      (allowed === 'consumers' && !personal) ||
      (allowed === 'organizations' && personal) ||
      (GUID.test(allowed) && tid !== allowed)
    if (wrongTenant)
      throw new OAuthError('bad_issuer', 'That Microsoft account type is not allowed')

    const email = normalizeEmail(claims.email)
    return {
      // An id is only unique within its issuer, and here the issuer is the tenant.
      providerId: `${tid}:${claims.sub}`,
      email,
      // A work or school tenant can put any address in the email claim, so it
      // counts only when Microsoft says the domain's owner verified it
      // (the optional "xms_edov" claim). Personal accounts are verified by Microsoft.
      emailVerified: email !== null && (personal || isTrue(claims.xms_edov)),
      // A Microsoft account can be opened with any address, so Microsoft
      // doesn't run the mailbox behind it.
      emailAuthoritative: false,
      name: cleanName(claims.name),
    }
  },
}

const linkedin: SignInProvider = {
  id: 'linkedin',
  label: PROVIDER_LABELS.linkedin,
  clientIdEnv: 'LINKEDIN_CLIENT_ID',
  clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
  authorizationEndpoint: () => 'https://www.linkedin.com/oauth/v2/authorization',
  tokenEndpoint: () => 'https://www.linkedin.com/oauth/v2/accessToken',
  scope: 'openid profile email',
  // LinkedIn's sign-in supports neither, so the state check alone ties the
  // answer to the browser that asked. The profile is read from LinkedIn
  // directly with the access token instead of from an ID token.
  pkce: false,
  nonce: false,
  accountChooser: false,
  async readProfile(tokens) {
    if (!tokens.accessToken)
      throw new OAuthError('no_access_token', 'LinkedIn sent no access token')
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(PROFILE_TIMEOUT_MS),
      cache: 'no-store',
    })
    const info = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!response.ok || !info) {
      throw new OAuthError('profile_failed', `LinkedIn profile request answered ${response.status}`)
    }
    const { sub } = info
    if (typeof sub !== 'string' || sub.length === 0 || sub.length > 255) {
      throw new OAuthError('profile_failed', 'LinkedIn named nobody')
    }
    const email = normalizeEmail(info.email)
    return {
      providerId: sub,
      email,
      emailVerified: email !== null && isTrue(info.email_verified),
      emailAuthoritative: false,
      name: cleanName(info.name, [info.given_name, info.family_name].filter(Boolean).join(' ')),
    }
  },
}

const PROVIDERS: Record<SignInProviderId, SignInProvider> = { google, microsoft, linkedin }

/** In the order the buttons are shown. */
export const SIGN_IN_PROVIDER_IDS: SignInProviderId[] = ['google', 'microsoft', 'linkedin']

export function getSignInProvider(id: string): SignInProvider | null {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, id)
    ? PROVIDERS[id as SignInProviderId]
    : null
}

export function providerCredentials(
  provider: SignInProvider
): { clientId: string; clientSecret: string } | null {
  const clientId = (process.env[provider.clientIdEnv] || '').trim()
  const clientSecret = (process.env[provider.clientSecretEnv] || '').trim()
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

/** Providers that are fully set up, in display order. */
export function configuredProviders(): SignInProvider[] {
  return SIGN_IN_PROVIDER_IDS.map((id) => PROVIDERS[id]).filter(
    (provider) => providerCredentials(provider) !== null
  )
}

/** What a page needs to draw the buttons: never the credentials. */
export interface ProviderSummary {
  id: SignInProviderId
  label: string
}

export function providerSummaries(): ProviderSummary[] {
  return configuredProviders().map(({ id, label }) => ({ id, label }))
}
