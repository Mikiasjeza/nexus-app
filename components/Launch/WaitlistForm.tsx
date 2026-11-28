'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics'
import Turnstile from '@/components/Security/Turnstile'

/** Join the launch waitlist: email, explicit consent, bot check, honeypot. */
export default function WaitlistForm({
  consentText,
  source,
}: {
  consentText: string
  source: string
}) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [token, setToken] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('busy')
    setMessage('')
    try {
      const res = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent, website, source, turnstileToken: token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setState('done')
      setMessage(data.message)
      try {
        track('waitlist_signup', { source })
      } catch {
        // Analytics is optional and only loads with consent.
      }
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (state === 'done') {
    return (
      <p role="status" className="border border-line p-5 text-lg">
        {message}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="metalab-input min-h-12"
          />
        </label>
        <button
          type="submit"
          disabled={state === 'busy' || !consent || !email}
          className="button-base button-accent min-h-12 px-6 disabled:opacity-60"
        >
          {state === 'busy' ? 'Joining…' : 'Join the waitlist'}
        </button>
      </div>
      {/* Hidden from people; bots that fill every field are ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          {consentText}{' '}
          <a href="/privacy" className="text-ink underline underline-offset-2">
            Privacy Policy
          </a>
        </span>
      </label>
      <Turnstile onToken={setToken} />
      {message && (
        <p role="alert" className="text-sm text-critical">
          {message}
        </p>
      )}
    </form>
  )
}
