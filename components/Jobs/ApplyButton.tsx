'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check, X } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useUser } from '@/lib/hooks/useUser'

type Props = {
  jobId: string
  jobTitle: string
  companyName: string
  /** The person's current application status for this job, if any. */
  status?: string
  onChange?: (status: string | undefined) => void
}

/**
 * Apply to a job: a short dialog with an optional note, which says plainly
 * what the company will see. Once applied, shows the status and lets the
 * person withdraw.
 */
export default function ApplyButton({ jobId, jobTitle, companyName, status, onChange }: Props) {
  const { user } = useUser()
  const pathname = usePathname() ?? '/marketplace'
  const dialog = useRef<HTMLDialogElement>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <Link
        href={`/auth/login?next=${encodeURIComponent(pathname)}`}
        className="button-base button-primary min-h-9 px-4 text-sm"
      >
        Apply
      </Link>
    )
  }
  if (user.accountType === 'employer') return null

  const active = status && status !== 'withdrawn'

  const send = async (method: 'POST' | 'DELETE') => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:
          method === 'POST' ? JSON.stringify({ message: message.trim() || undefined }) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      onChange?.(method === 'POST' ? 'submitted' : 'withdrawn')
      if (method === 'POST') {
        dialog.current?.close()
        setMessage('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (active) {
    return (
      <span className="inline-flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-verified-ink">
          <Check className="size-4" aria-hidden />
          {status === 'shortlisted' ? 'Shortlisted' : 'Applied'}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm(`Withdraw your application for ${jobTitle}?`)) send('DELETE')
          }}
          className="text-ink-faint hover:text-ink"
        >
          Withdraw
        </button>
      </span>
    )
  }

  return (
    <>
      <Button size="sm" onClick={() => dialog.current?.showModal()}>
        Apply
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`apply-title-${jobId}`}
        className="w-[min(34rem,calc(100vw-2rem))] border border-rule bg-ground p-0 text-ink backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={`apply-title-${jobId}`} className="text-lg font-medium">
            Apply: {jobTitle}
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="text-ink-faint hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send('POST')
          }}
          className="space-y-5 px-5 py-6"
        >
          <p className="text-sm text-ink-muted">
            {companyName} will see your name, email address and your Nexus passport, including your
            verified skills. You can withdraw at any time.
          </p>
          <div>
            <label className="metalab-label" htmlFor={`apply-note-${jobId}`}>
              A short note (optional)
            </label>
            <textarea
              id={`apply-note-${jobId}`}
              rows={4}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why this role, and anything they should know."
              className="metalab-input resize-y py-2"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          )}
          <Button type="submit" isLoading={busy} disabled={busy}>
            Send application
          </Button>
        </form>
      </dialog>
    </>
  )
}
