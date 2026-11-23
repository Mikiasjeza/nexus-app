'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertCircle, X } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import {
  MAX_DETAILS,
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from '@/lib/report-options'

type Props = {
  targetType: ReportTarget
  targetId: string
  /** What is being reported, for the dialog title, e.g. "this profile". */
  what?: string
  className?: string
}

/**
 * A quiet "Report" link that opens a small dialog: pick a reason, add detail,
 * send. Signed-out visitors are asked to sign in first.
 */
export default function ReportButton({ targetType, targetId, what, className = '' }: Props) {
  const { user } = useUser()
  const pathname = usePathname() ?? '/'
  const dialog = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const subject = what ?? `this ${targetType}`

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    const reset = () => {
      if (state === 'sent') {
        setReason('')
        setDetails('')
        setState('idle')
      }
    }
    el.addEventListener('close', reset)
    return () => el.removeEventListener('close', reset)
  }, [state])

  const linkClass = `inline-flex items-center gap-1.5 text-sm text-ink-faint transition-colors hover:text-ink ${className}`

  if (!user) {
    return (
      <Link href={`/auth/login?next=${encodeURIComponent(pathname)}`} className={linkClass}>
        <AlertCircle className="size-3.5" aria-hidden />
        Report
      </Link>
    )
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return
    setState('sending')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send your report')
      setState('sent')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Could not send your report')
    }
  }

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={linkClass}>
        <AlertCircle className="size-3.5" aria-hidden />
        Report
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`report-title-${targetId}`}
        className="w-[min(32rem,calc(100vw-2rem))] border border-rule bg-ground p-0 text-ink backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={`report-title-${targetId}`} className="text-lg font-medium">
            Report {subject}
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

        {state === 'sent' ? (
          <div className="space-y-4 px-5 py-6">
            <p>Thanks. An admin will look at it. We never show who sent a report.</p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="button-base button-primary min-h-10 px-4"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-5 px-5 py-6">
            <fieldset>
              <legend className="metalab-label">What&apos;s wrong?</legend>
              <div className="space-y-2">
                {(Object.keys(REPORT_REASONS) as ReportReason[]).map((key) => (
                  <label key={key} className="flex items-center gap-3 text-sm">
                    <input
                      type="radio"
                      name={`reason-${targetId}`}
                      value={key}
                      checked={reason === key}
                      onChange={() => setReason(key)}
                      className="accent-verified"
                    />
                    {REPORT_REASONS[key]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="metalab-label" htmlFor={`details-${targetId}`}>
                Anything else? (optional)
              </label>
              <textarea
                id={`details-${targetId}`}
                rows={3}
                maxLength={MAX_DETAILS}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="metalab-input resize-y py-2"
              />
            </div>
            {state === 'error' && (
              <p role="alert" className="text-sm text-critical">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={!reason || state === 'sending'}
              className="button-base button-primary min-h-10 px-4"
            >
              {state === 'sending' ? 'Sending…' : 'Send report'}
            </button>
          </form>
        )}
      </dialog>
    </>
  )
}
