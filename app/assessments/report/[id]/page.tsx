'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import { ApiError, assessmentsApi, type ResultReport } from '@/lib/api/assessments'

const RESULT_LABEL: Record<string, string> = {
  PASSED: 'Passed',
  NOT_PASSED: 'Not passed',
  PENDING_REVIEW: 'Under review',
  INCONCLUSIVE: 'Not graded yet',
}

const SCORED_BY: Record<string, string> = {
  tests: 'Hidden tests',
  checks: 'Automatic checks',
  ai: 'AI grader',
  human: 'Reviewer',
  none: 'Not scored yet',
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })

/**
 * The detailed assessment report (a paid feature): everything about one
 * result on a page laid out for printing, so "Save as PDF" in the print
 * dialog produces a clean document. The server refuses it to plans without
 * detailed reports.
 */
export default function AssessmentReportPage() {
  const id = String(useParams().id ?? '')
  const [report, setReport] = useState<ResultReport | null>(null)
  const [error, setError] = useState<{ message: string; upgrade: boolean } | null>(null)

  useEffect(() => {
    assessmentsApi
      .report(id)
      .then(setReport)
      .catch((e: Error) =>
        setError({ message: e.message, upgrade: e instanceof ApiError && e.status === 402 })
      )
  }, [id])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl">Detailed report</h1>
        <p className="mt-4 text-ink-muted">{error.message}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {error.upgrade && (
            <Link href="/pricing" className="button-base button-primary px-5">
              See Pro
            </Link>
          )}
          <Link href={`/assessments/result/${id}`} className="button-base button-secondary px-5">
            Back to the result
          </Link>
        </div>
      </div>
    )
  }
  if (!report) return <Loader />

  const verifyUrl =
    report.credential && typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${report.credential.id}`
      : null

  return (
    <article className="print-report mx-auto max-w-3xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/assessments/result/${report.id}`} className="metalab-link text-sm">
          Back to the result
        </Link>
        <Button onClick={() => window.print()}>Print or save as PDF</Button>
      </div>

      <div className="border-b border-line pb-6">
        <p className="text-sm text-ink-faint">Nexus assessment report</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">{report.title}</h1>
        <p className="mt-3 text-ink-muted">
          {report.candidateName}
          {report.completedAt && ` · completed ${formatDate(report.completedAt)}`}
        </p>
      </div>

      <section aria-labelledby="summary-heading" className="mt-8">
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-ink-faint">Result</dt>
            <dd className="mt-1 font-medium">
              {report.result ? (RESULT_LABEL[report.result] ?? report.result) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Score</dt>
            <dd className="tabular mt-1 font-medium">
              {report.score === null ? '—' : `${report.score} / 100`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Pass mark</dt>
            <dd className="tabular mt-1 font-medium">{report.passThreshold}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Mode</dt>
            <dd className="mt-1 font-medium">
              {report.mode === 'ai_assisted' ? 'AI-assisted' : 'Independent'}
            </dd>
          </div>
        </dl>
      </section>

      {report.credential && (
        <section aria-labelledby="credential-heading" className="mt-10 border-t border-line pt-6">
          <h2 id="credential-heading" className="text-base font-medium">
            Credential {report.credential.id}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {report.credential.status === 'ACTIVE'
              ? `Valid until ${formatDate(report.credential.expiresAt)}.`
              : `Status: ${report.credential.status.toLowerCase()}.`}
            {verifyUrl && ` Anyone can check it at ${verifyUrl}.`}
          </p>
        </section>
      )}

      {report.feedback.length > 0 && (
        <section aria-labelledby="feedback-heading" className="mt-10 border-t border-line pt-6">
          <h2 id="feedback-heading" className="text-base font-medium">
            Feedback
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted">
            {report.feedback.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {report.criteria.length > 0 && (
        <section aria-labelledby="criteria-heading" className="mt-10 border-t border-line pt-6">
          <h2 id="criteria-heading" className="text-base font-medium">
            Score by criterion
          </h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-ink-faint">
              <tr>
                <th scope="col" className="py-2 font-normal">
                  Criterion
                </th>
                <th scope="col" className="py-2 font-normal">
                  Scored by
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Weight
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {report.criteria.map((c) => (
                <tr key={c.id} className="border-t border-line align-top">
                  <td className="py-2 pr-4">{c.label}</td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {SCORED_BY[c.assessedBy] ?? c.assessedBy}
                  </td>
                  <td className="py-2 text-right">{c.weight}%</td>
                  <td className="py-2 text-right">
                    {c.score === null ? '—' : `${Math.round(c.score * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 space-y-6">
            {report.criteria
              .filter((c) => c.notes || c.evidence.length > 0)
              .map((c) => (
                <div key={c.id} className="break-inside-avoid">
                  <h3 className="text-sm font-medium">{c.label}</h3>
                  {c.notes && (
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{c.notes}</p>
                  )}
                  {c.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {c.evidence.map((line, i) => (
                        <li
                          key={i}
                          className="border-l border-line-strong pl-3 font-mono text-xs text-ink-faint"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      <p className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
        Rubric {report.rubric.id} version {report.rubric.version}. Report generated{' '}
        {formatDate(report.generatedAt)}. Scores marked AI grader were set by an AI from quoted
        evidence and can be appealed; credentials can always be checked at their verification link.
      </p>
    </article>
  )
}
