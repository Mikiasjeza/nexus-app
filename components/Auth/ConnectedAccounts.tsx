'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/UI/ToastProvider'
import { ProviderIcon } from '@/components/Auth/SocialSignIn'
import { connectErrorMessage, providerLabel, type SignInProviderId } from '@/lib/auth/oauth/labels'

type Connections = {
  providers: { id: SignInProviderId; label: string; connected: boolean; account: string | null }[]
  github: { available: boolean; connected: boolean; account: string | null }
}

const actionClass = 'button-base button-secondary min-h-11 shrink-0 px-5'

/** A link that leaves the app for the provider, or its inert twin in the guest preview. */
function Action({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: string
}) {
  // Plain text for guests: a disabled-looking link still opens from the keyboard.
  if (disabled) {
    return (
      <span aria-disabled="true" className={`${actionClass} opacity-40`}>
        {children}
      </span>
    )
  }
  // Full navigation (not <Link>): the flow leaves the app.
  return (
    <a href={href} className={actionClass}>
      {children}
    </a>
  )
}

const GITHUB_RESULTS: Record<
  string,
  { type: 'success' | 'error'; title: string; message: string }
> = {
  connected: {
    type: 'success',
    title: 'GitHub connected',
    message: 'Repositories you link as evidence can now be confirmed as yours.',
  },
  already_linked: {
    type: 'error',
    title: 'GitHub not connected',
    message: 'That GitHub account is already linked to a different Nexus account.',
  },
  cancelled: { type: 'error', title: 'GitHub not connected', message: 'Nothing was connected.' },
  failed: {
    type: 'error',
    title: 'GitHub not connected',
    message: 'We couldn’t connect GitHub. Please try again.',
  },
}

/**
 * Settings → Sign-in: the providers a person can sign in with, and GitHub,
 * which only proves that linked repositories are theirs.
 */
export default function ConnectedAccounts({ disabled = false }: { disabled?: boolean }) {
  const { addToast } = useToast()
  const [data, setData] = useState<Connections | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/connections', { credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<Connections>) : null))
      .then((connections) => {
        if (!cancelled) setData(connections)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // The provider sends people back here with the result in the address.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const connectError = params.get('connect_error')
    const github = params.get('github')
    if (!connected && !connectError && !github) return

    const name = providerLabel(connected)
    if (name) {
      addToast({
        type: 'success',
        title: `${name} connected`,
        message: `You can now sign in with ${name}.`,
      })
    } else if (connectError) {
      addToast({
        type: 'error',
        title: 'Not connected',
        message: connectErrorMessage(connectError, params.get('provider')),
      })
    } else if (github && GITHUB_RESULTS[github]) {
      addToast(GITHUB_RESULTS[github])
    }
    window.history.replaceState(null, '', window.location.pathname)
  }, [addToast])

  if (!data || (data.providers.length === 0 && !data.github.available)) return null

  return (
    <ul className="ruled-list mt-6 border-y border-line">
      {data.providers.map((provider) => (
        <li
          key={provider.id}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <ProviderIcon id={provider.id} className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">{provider.label}</p>
              <p className="mt-1 break-words text-sm text-ink-muted">
                {provider.connected
                  ? `Connected${provider.account ? ` as ${provider.account}` : ''}. You can sign in with ${provider.label}.`
                  : `Sign in with ${provider.label} instead of typing your password.`}
              </p>
            </div>
          </div>
          <Action
            href={`/api/auth/oauth/${provider.id}/authorize?mode=connect`}
            disabled={disabled}
          >
            {provider.connected ? 'Change' : 'Connect'}
          </Action>
        </li>
      ))}
      {data.github.available && (
        <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium">GitHub</p>
            <p className="mt-1 break-words text-sm text-ink-muted">
              {data.github.connected
                ? `Connected${data.github.account ? ` as @${data.github.account}` : ''}. `
                : ''}
              Proves that repositories you link as evidence are yours. It reads only your public
              profile, and it isn&apos;t a way to sign in.
            </p>
          </div>
          <Action href="/api/auth/github/authorize" disabled={disabled}>
            {data.github.connected ? 'Change' : 'Connect'}
          </Action>
        </li>
      )}
    </ul>
  )
}
