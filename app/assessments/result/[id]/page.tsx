'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import CriteriaList from '@/components/Assessments/CriteriaList'
import { ApiError, assessmentsApi, type ResultView } from '@/lib/api/assessments'

const HEADLINES: Record<string, { title: string; description: string }> = {
  PASSED: {
    title: 'Passed',
    description: 'Your credential is live. Share its link anywhere; anyone can check it.',
  },
  NOT_PASSED: {
    title: 'Not this time',
    description: 'You didn’t reach the pass mark. The breakdown shows where the points went.',
  },
  PENDING_REVIEW: {
    title: 'Under review',
    description:
      'Part of this attempt needs a person to score it before the result is final. You’ll see the outcome here.',
  },
  INCONCLUSIVE: {
    title: 'Not graded yet',
    description:
      'Our grading system failed on this attempt. It doesn’t count against you, and it will be graded once the problem is fixed.',
  },
  EXPIRED: {
    title: 'Time ran out',
    description: 'Nothing was saved for the main task, so there was nothing to grade.',
  },
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })

export default function ResultPage() {
  const id = String(useParams().id ?? '')
  const [result, setResult] = useState<ResultView | null>(null)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)
  const [appealOpen, setAppealOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [appealError, setAppealError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () =>
    assessmentsApi
      .result(id)
      .then(setResult)
      .catch((e: Error) =>
        setError({ message: e.message, status: e instanceof ApiError ? e.status : undefined })
      )

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const sendAppeal = async () => {
    setSending(true)
    setAppealError(null)
    try {
      await assessmentsApi.appeal(id, reason)
      setAppealOpen(false)
      setReason('')
      await load()
    } catch (e) {
      setAppealError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  if (error) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title={error.status === 401 ? 'Sign in first' : 'Result not found'}
            description={error.message}
          />
          <Link href="/assessments" className="metalab-link">
            All assessments
          </Link>
        </div>
      </AppPageShell>
    )
  }
  if (!result) return <Loader />

  const key =
    result.status === 'EXPIRED'
      ? 'EXPIRED'
      : result.status === 'FAILED_SYSTEM'
        ? 'INCONCLUSIVE'
        : (result.result ?? 'PENDING_REVIEW')
  const headline = HEADLINES[key] ?? HEADLINES.PENDING_REVIEW
  const verifyPath = result.credential ? `/verify/${result.credential.id}` : null
  const openAppeal = result.appeals.find((a) => a.status === 'OPEN')
  const canAppeal = result.status === 'COMPLETED' && result.result === 'NOT_PASSED' && !openAppeal

  const copyLink = async () => {
    if (!verifyPath) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${verifyPath}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <AppPageShell>
      <div className="page-shell max-w-4xl">
        <Link
          href={`/assessments/${result.slug}`}
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← {result.skillName}
        </Link>
        <PageHeader
          title={headline.title}
          rule={key === 'PASSED'}
          description={headline.description}
        />

        <div className="flex flex-wrap items-end gap-x-14 gap-y-6 border-t border-line pt-8">
          <div>
            <p
              className={`display-number text-7xl ${key === 'PASSED' ? 'text-verified-ink' : 'text-ink'}`}
            >
              {result.score === null ? '—' : result.score}
            </p>
            <p className="mt-1 text-sm text-ink-muted">score, pass mark {result.passThreshold}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
            <dt className="text-ink-faint">Assessment</dt>
            <dd className="text-ink">{result.title}</dd>
            <dt className="text-ink-faint">Mode</dt>
            <dd className="text-ink">
              {result.mode === 'ai_assisted' ? 'AI-assisted' : 'Independent'}
            </dd>
            <dt className="text-ink-faint">Rubric</dt>
            <dd className="text-ink">
              {result.rubric.id} v{result.rubric.version}
            </dd>
            {result.completedAt && (
              <>
                <dt className="text-ink-faint">Finished</dt>
                <dd className="text-ink">{formatDate(result.completedAt)}</dd>
              </>
            )}
          </dl>
        </div>

        {result.credential && verifyPath && (
          <section
            aria-labelledby="credential-heading"
            className="mt-12 rounded-2xl bg-verified-wash p-6"
          >
            <h2 id="credential-heading" className="text-base text-ink">
              Credential {result.credential.id}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {result.credential.status === 'ACTIVE'
                ? `Valid until ${formatDate(result.credential.expiresAt)}.`
                : `Status: ${result.credential.status.toLowerCase()}.`}{' '}
              It appears on your public Skill Passport.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={verifyPath} className="button-base button-primary">
                Open the credential
              </Link>
              <Button variant="secondary" onClick={copyLink}>
                {copied ? 'Link copied' : 'Copy link'}
              </Button>
            </div>
          </section>
        )}

        {result.feedback.length > 0 && (
          <section aria-labelledby="feedback-heading" className="mt-12">
            <h2 id="feedback-heading" className="text-base font-medium">
              Feedback
            </h2>
            <ul className="mt-4 space-y-2 text-[0.9375rem] leading-relaxed text-ink-muted">
              {result.feedback.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {result.criteria.length > 0 && (
          <section aria-labelledby="breakdown-heading" className="mt-12">
            <h2 id="breakdown-heading" className="text-base font-medium">
              Breakdown
            </h2>
            <div className="mt-4">
              <CriteriaList criteria={result.criteria} pendingLabel="Waiting for a reviewer" />
            </div>
          </section>
        )}

        <section aria-labelledby="next-heading" className="mt-12 border-t border-line pt-8">
          <h2 id="next-heading" className="sr-only">
            What next
          </h2>
          {result.appeals.map((appeal) => (
            <p key={appeal.id} className="mb-4 text-sm text-ink-muted">
              Appeal from {formatDate(appeal.createdAt)}:{' '}
              {appeal.status === 'OPEN'
                ? 'open. A reviewer will reply here.'
                : `${appeal.status === 'UPHELD' ? 'upheld' : 'not upheld'}. ${appeal.resolution ?? ''}`}
            </p>
          ))}
          <div className="flex flex-wrap gap-3">
            <Link href={`/assessments/${result.slug}`} className="button-base button-secondary">
              {key === 'PASSED' ? 'Back to the assessment' : 'Retake options'}
            </Link>
            {canAppeal && !appealOpen && (
              <Button variant="ghost" onClick={() => setAppealOpen(true)}>
                Appeal this result
              </Button>
            )}
          </div>
          {appealOpen && (
            <div className="mt-6 max-w-2xl">
              <label htmlFor="appeal-reason" className="metalab-label">
                What do you think went wrong? A reviewer reads every appeal.
              </label>
              <textarea
                id="appeal-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                maxLength={2000}
                className="metalab-input resize-y leading-relaxed"
              />
              {appealError && (
                <p role="alert" className="mt-2 text-sm text-[#ffc9c9]">
                  {appealError}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={sendAppeal}
                  isLoading={sending}
                  disabled={reason.trim().length < 20}
                >
                  Send appeal
                </Button>
                <Button variant="ghost" onClick={() => setAppealOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppPageShell>
  )
}
