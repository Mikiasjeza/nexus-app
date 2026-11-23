'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'

/** Pages where the reminder would get in the way. */
const HIDDEN_PREFIXES = ['/auth/', '/onboarding']

/**
 * A thin reminder under the header until the person confirms their email.
 * Candidates only appear in employer searches once they have.
 */
export default function VerifyEmailBanner() {
  const pathname = usePathname() ?? ''
  const { user } = useUser()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  if (!user?.needsEmailVerification) return null
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  const resend = async () => {
    setStatus('sending')
    try {
      const res = await fetch('/api/auth/verify-email/send', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send the email')
      setStatus('sent')
      setMessage(`Sent to ${user.email}. Check your inbox.`)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Could not send the email')
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule bg-raised px-4 py-2.5 text-sm"
    >
      <p className="text-ink">
        {status === 'sent' || status === 'error'
          ? message
          : user.accountType === 'employer'
            ? 'Confirm your email address to secure your account.'
            : 'Confirm your email address so employers can find you.'}
      </p>
      {status !== 'sent' && (
        <button
          type="button"
          onClick={resend}
          disabled={status === 'sending'}
          className="font-medium text-ink underline underline-offset-2 hover:no-underline disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Send confirmation email'}
        </button>
      )}
    </div>
  )
}
