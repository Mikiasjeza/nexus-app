/**
 * Provider names and the messages people see when a provider sign-in or link
 * doesn't go through. No server imports: pages in the browser use this too.
 */

export type SignInProviderId = 'google' | 'microsoft' | 'linkedin'

export const PROVIDER_LABELS: Record<SignInProviderId, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  linkedin: 'LinkedIn',
}

/** "Google" for 'google'; null for anything that isn't a sign-in provider. */
export function providerLabel(id: string | null | undefined): string | null {
  return id && Object.prototype.hasOwnProperty.call(PROVIDER_LABELS, id)
    ? PROVIDER_LABELS[id as SignInProviderId]
    : null
}

/** For the sign-in page, from the `error` and `provider` the callback redirects with. */
export function signInErrorMessage(code: string | null, provider: string | null): string {
  if (!code) return ''
  const name = providerLabel(provider)
  switch (code) {
    case 'account_exists':
      return `An account with that email already exists. Sign in with your password, or use “Forgot password?” to choose a new one. Then connect ${name ?? 'the account'} in Settings.`
    case 'email_unverified':
      return `${name ?? 'That provider'} hasn’t confirmed your email address, so we can’t create an account from it. Create an account with your email and a password instead.`
    case 'oauth_cancelled':
      return name ? `Sign-in with ${name} was cancelled.` : 'Sign-in was cancelled.'
    case 'invalid_state':
      return 'That sign-in took too long or was started in another tab. Please try again.'
    case 'oauth_unavailable':
      return 'That sign-in option isn’t available right now.'
    case 'oauth_rate_limited':
      return 'Too many attempts. Wait a minute, then try again.'
    case 'github_signin_removed':
      return 'GitHub sign-in is no longer available. Sign in another way below. If you never set a password, use “Forgot password?” to choose one.'
    default:
      return name
        ? `We couldn’t sign you in with ${name}. Please try again.`
        : 'We couldn’t sign you in. Please try again.'
  }
}

/** For Settings, from the `connect_error` and `provider` the callback redirects with. */
export function connectErrorMessage(code: string, provider: string | null): string {
  const name = providerLabel(provider) ?? 'that account'
  switch (code) {
    case 'already_linked':
      return `That ${name} account is already linked to a different Nexus account.`
    case 'session_changed':
      return 'You were signed out before the link finished. Please try again.'
    case 'oauth_cancelled':
      return 'Nothing was connected.'
    case 'oauth_rate_limited':
      return 'Too many attempts. Wait a minute, then try again.'
    default:
      return `We couldn’t connect ${name}. Please try again.`
  }
}
