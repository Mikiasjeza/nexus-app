import type { ProviderSummary, SignInProviderId } from '@/lib/auth/oauth/providers'

/** Each provider's own mark, in its own colours, as their sign-in guidelines ask. */
export function ProviderIcon({
  id,
  className = 'h-5 w-5',
}: {
  id: SignInProviderId
  className?: string
}) {
  if (id === 'google') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    )
  }
  if (id === 'microsoft') {
    return (
      <svg className={className} viewBox="0 0 21 21" aria-hidden>
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#fff" />
      <path
        fill="#0A66C2"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  )
}

type Props = {
  providers: ProviderSummary[]
  /** Where to land after signing in; the server checks it stays on this site. */
  next?: string | null
}

/**
 * "Continue with …" buttons for the sign-in providers that are switched on.
 * Renders nothing when there are none. Plain links, not <Link>: the sign-in
 * leaves the app for the provider.
 */
export default function SocialSignIn({ providers, next }: Props) {
  if (providers.length === 0) return null
  const query = next ? `?next=${encodeURIComponent(next)}` : ''
  return (
    <div className="space-y-2.5">
      {providers.map((provider) => (
        <a
          key={provider.id}
          href={`/api/auth/oauth/${provider.id}/authorize${query}`}
          className="metalab-oauth focus-ring"
        >
          <ProviderIcon id={provider.id} />
          <span>Continue with {provider.label}</span>
        </a>
      ))}
    </div>
  )
}

/** The hairline "or" between the provider buttons and the email form. */
export function OrDivider() {
  return (
    <div className="relative my-7" role="separator" aria-label="or">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t metalab-divider" />
      </div>
      <div className="relative flex justify-center text-sm" aria-hidden>
        <span className="bg-raised px-3 metalab-muted">or</span>
      </div>
    </div>
  )
}
