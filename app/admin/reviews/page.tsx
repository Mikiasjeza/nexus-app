'use client'

import { useCallback, useEffect, useState } from 'react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import CriteriaList from '@/components/Assessments/CriteriaList'
import type { CriterionScore, IntegrityFlag, Rubric, StageWork } from '@/lib/assessments/types'

type QueueRow = {
  id: string
  candidate: string
  skillName: string
  mode: string
  status: string
  submittedAt: string | null
}
type Runtime = { id: number; name: string } | null

type Queue = {
  runner: {
    configured: boolean
    provider: 'self-hosted' | 'rapidapi' | null
    reachable: boolean
    version: string | null
    python: Runtime
    javascript: Runtime
    javascriptRunsOn: 'judge0' | 'quickjs'
    error: string | null
    devPython: boolean
    usage: { today: number; limit: number }
  }
  costs: {
    windowDays: number
    graded: number
    withAi: number
    aiCostUsd: number
    averageAiCostUsd: number
    codeRuns: number
  }
  pending: QueueRow[]
  failed: QueueRow[]
  appeals: { id: string; attemptId: string; reason: string; createdAt: string }[]
}
type Detail = {
  attempt: {
    id: string
    status: string
    result: string | null
    score: number | null
    mode: string
    runCount: number
  }
  candidate: { name: string; email: string } | null
  assessment: {
    skillName: string
    title: string
    workspace: string
    rubric: Rubric
    explainQuestions: string[]
  } | null
  submissions: Record<string, { work: StageWork; submittedAt: string }>
  evaluation: {
    criteria: CriterionScore[]
    integrity: IntegrityFlag[]
    feedback: string[]
    model?: string
  } | null
  anchors: { value: number; label: string }[]
  events: { counts: Record<string, number>; largestPaste: number }
  credential: { id: string; status: string } | null
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}

const STAGE_NAMES: Record<string, string> = {
  main: 'The task',
  followup: 'Follow-up',
  explain: 'Explain',
}

export default function ReviewsPage() {
  const [queue, setQueue] = useState<Queue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [decision, setDecision] = useState<'score' | 'void'>('score')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [resolutions, setResolutions] = useState<Record<string, string>>({})

  const loadQueue = useCallback(() => {
    api<Queue>('/api/admin/assessments')
      .then(setQueue)
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(loadQueue, [loadQueue])

  useEffect(() => {
    if (!selected) return
    setDetail(null)
    setMessage(null)
    api<Detail>(`/api/admin/assessments/${selected}`)
      .then((d) => {
        setDetail(d)
        const initial: Record<string, number> = {}
        for (const c of d.evaluation?.criteria ?? []) {
          if (c.score !== null && (c.assessedBy === 'ai' || c.assessedBy === 'human'))
            initial[c.id] = Math.round(c.score * 4)
        }
        setScores(initial)
        setDecision('score')
        setNote('')
      })
      .catch((e: Error) => setMessage(e.message))
  }, [selected])

  const act = async (path: string, body: unknown, done: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await api(path, body)
      setMessage(done)
      setSelected(null)
      loadQueue()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader title="Not available" description={error} />
        </div>
      </AppPageShell>
    )
  }
  if (!queue) return <Loader />

  const judged = detail?.assessment?.rubric.criteria.filter((c) => c.source.startsWith('ai:')) ?? []

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Reviews"
          rule
          description="Attempts waiting for a person, gradings that failed, and appeals. Automatic scores can’t be changed here."
        />
        <RunnerPanel runner={queue.runner} />

        <dl className="mb-12 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-line pt-6 md:grid-cols-4">
          <div>
            <dt className="text-sm text-ink-faint">Graded, last {queue.costs.windowDays} days</dt>
            <dd className="display-number mt-1 text-4xl">{queue.costs.graded}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">AI cost</dt>
            <dd className="display-number mt-1 text-4xl">${queue.costs.aiCostUsd.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">AI cost per graded assessment</dt>
            <dd className="display-number mt-1 text-4xl">
              ${queue.costs.averageAiCostUsd.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Code runs while working</dt>
            <dd className="display-number mt-1 text-4xl">{queue.costs.codeRuns}</dd>
          </div>
        </dl>
        {queue.costs.graded > queue.costs.withAi && (
          <p className="-mt-8 mb-10 text-sm text-ink-faint">
            {queue.costs.graded - queue.costs.withAi} of these were graded without an AI call. Costs
            read $0 when the model’s price isn’t set (AI_INPUT_COST_PER_MTOK,
            AI_OUTPUT_COST_PER_MTOK).
          </p>
        )}
        {message && <p className="mb-6 text-sm text-caution">{message}</p>}

        <div className="grid gap-12 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="space-y-10">
            <QueueList
              title="Waiting for review"
              rows={queue.pending}
              selected={selected}
              onSelect={setSelected}
            />
            <section>
              <h2 className="text-base font-medium">Failed gradings</h2>
              {queue.failed.length === 0 ? (
                <p className="mt-3 text-sm text-ink-faint">None.</p>
              ) : (
                <ul className="ruled-list mt-3 border-t border-line">
                  {queue.failed.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <span>
                        {row.candidate} · {row.skillName}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          act(
                            `/api/admin/assessments/${row.id}`,
                            { action: 'retry' },
                            'Graded again.'
                          )
                        }
                      >
                        Retry
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-base font-medium">Open appeals</h2>
              {queue.appeals.length === 0 ? (
                <p className="mt-3 text-sm text-ink-faint">None.</p>
              ) : (
                <ul className="ruled-list mt-3 border-t border-line">
                  {queue.appeals.map((appeal) => (
                    <li key={appeal.id} className="space-y-3 py-4 text-sm">
                      <p className="text-ink-muted">{appeal.reason}</p>
                      <button
                        type="button"
                        className="metalab-link"
                        onClick={() => setSelected(appeal.attemptId)}
                      >
                        Open the attempt
                      </button>
                      <textarea
                        aria-label="Resolution sent to the candidate"
                        placeholder="Resolution sent to the candidate"
                        value={resolutions[appeal.id] ?? ''}
                        onChange={(e) =>
                          setResolutions((r) => ({ ...r, [appeal.id]: e.target.value }))
                        }
                        rows={3}
                        className="metalab-input resize-y"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            act(
                              `/api/admin/appeals/${appeal.id}`,
                              { outcome: 'UPHELD', resolution: resolutions[appeal.id] ?? '' },
                              'Appeal upheld; the attempt is back in review.'
                            )
                          }
                        >
                          Uphold
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            act(
                              `/api/admin/appeals/${appeal.id}`,
                              { outcome: 'REJECTED', resolution: resolutions[appeal.id] ?? '' },
                              'Appeal closed.'
                            )
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="min-w-0">
            {!selected && <p className="text-sm text-ink-faint">Choose an attempt to review.</p>}
            {selected && !detail && <Loader />}
            {detail && (
              <div className="space-y-10">
                <div>
                  <p className="display-number text-4xl">{detail.assessment?.skillName}</p>
                  <p className="mt-2 text-sm text-ink-muted">
                    {detail.candidate?.name} ({detail.candidate?.email}) ·{' '}
                    {detail.attempt.mode === 'ai_assisted' ? 'AI-assisted' : 'Independent'} ·{' '}
                    {detail.attempt.status} · {detail.attempt.runCount} runs
                  </p>
                </div>

                {detail.evaluation && detail.evaluation.integrity.length > 0 && (
                  <section>
                    <h3 className="text-base font-medium">Signals</h3>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {detail.evaluation.integrity.map((flag, i) => (
                        <li
                          key={i}
                          className={flag.severity === 'review' ? 'text-caution' : 'text-ink-muted'}
                        >
                          {flag.detail}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-ink-faint">
                      Events:{' '}
                      {Object.entries(detail.events.counts)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(', ') || 'none'}{' '}
                      · largest paste {detail.events.largestPaste} chars
                    </p>
                  </section>
                )}

                {Object.entries(detail.submissions).map(([stage, sub]) => (
                  <section key={stage}>
                    <h3 className="text-base font-medium">{STAGE_NAMES[stage] ?? stage}</h3>
                    <div className="mt-3 space-y-3">
                      {sub.work.code !== undefined && (
                        <pre className="max-h-[28rem] overflow-auto rounded-xl bg-raised p-4 text-xs text-ink-muted">
                          {sub.work.code || '(empty)'}
                        </pre>
                      )}
                      {sub.work.text !== undefined && (
                        <p className="whitespace-pre-wrap rounded-xl bg-raised p-4 text-sm leading-relaxed text-ink-muted">
                          {sub.work.text || '(empty)'}
                        </p>
                      )}
                      {sub.work.queries &&
                        Object.entries(sub.work.queries).map(([id, query]) => (
                          <div key={id}>
                            <p className="text-xs text-ink-faint">{id}</p>
                            <pre className="mt-1 overflow-auto rounded-xl bg-raised p-3 text-xs text-ink-muted">
                              {query}
                            </pre>
                          </div>
                        ))}
                      {sub.work.answers?.map((answer, i) => (
                        <div key={i}>
                          <p className="text-sm text-ink">
                            {detail.assessment?.explainQuestions[i]}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                            {answer || '(no answer)'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                {detail.evaluation && (
                  <section>
                    <h3 className="text-base font-medium">Current scores</h3>
                    <div className="mt-3">
                      <CriteriaList criteria={detail.evaluation.criteria} />
                    </div>
                    {detail.evaluation.model && (
                      <p className="mt-2 text-xs text-ink-faint">
                        AI model: {detail.evaluation.model}
                      </p>
                    )}
                  </section>
                )}

                {detail.attempt.status === 'PENDING_REVIEW' && (
                  <section className="rounded-2xl bg-raised p-6">
                    <h3 className="text-base font-medium">Your review</h3>
                    <fieldset className="mt-4 space-y-4">
                      <legend className="sr-only">Judged criteria</legend>
                      {judged.map((c) => (
                        <label
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-3 text-sm"
                        >
                          <span>
                            <span className="text-ink">{c.label}</span>
                            <span className="block text-ink-faint">{c.description}</span>
                          </span>
                          <select
                            value={scores[c.id] ?? ''}
                            onChange={(e) =>
                              setScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))
                            }
                            className="metalab-input !w-44"
                          >
                            <option value="" disabled>
                              Score…
                            </option>
                            {detail.anchors.map((a) => (
                              <option key={a.value} value={a.value}>
                                {a.value} · {a.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="mt-6 flex flex-wrap gap-2">
                      <legend className="mb-2 text-sm text-ink-muted">Decision</legend>
                      <button
                        type="button"
                        className="pill"
                        aria-pressed={decision === 'score'}
                        onClick={() => setDecision('score')}
                      >
                        Score it
                      </button>
                      <button
                        type="button"
                        className="pill"
                        aria-pressed={decision === 'void'}
                        onClick={() => setDecision('void')}
                      >
                        Can’t accept as their own work
                      </button>
                    </fieldset>
                    <label htmlFor="review-note" className="metalab-label mt-6">
                      Note to the candidate {decision === 'void' ? '(required)' : '(optional)'}
                    </label>
                    <textarea
                      id="review-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="metalab-input resize-y"
                    />
                    <div className="mt-4">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          act(
                            `/api/admin/assessments/${detail.attempt.id}`,
                            { action: 'review', scores, decision, note },
                            'Review saved.'
                          )
                        }
                      >
                        Save review
                      </Button>
                    </div>
                  </section>
                )}

                {detail.credential && detail.credential.status !== 'REVOKED' && (
                  <section>
                    <h3 className="text-base font-medium">Credential {detail.credential.id}</h3>
                    <RevokeForm
                      busy={busy}
                      onRevoke={(reason) =>
                        act(
                          `/api/admin/assessments/${detail.attempt.id}`,
                          { action: 'revoke', reason },
                          'Credential revoked.'
                        )
                      }
                    />
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPageShell>
  )
}

/** Is code execution up, and where does each language run? */
function RunnerPanel({ runner }: { runner: Queue['runner'] }) {
  const status = !runner.configured
    ? runner.devPython
      ? { text: 'Local development: Python runs in Pyodide', tone: 'text-caution' }
      : { text: 'No code runner is set up: Python is closed', tone: 'text-caution' }
    : runner.reachable
      ? {
          text: `${runner.version ?? 'Code runner'} connected`,
          tone: 'text-verified-ink',
        }
      : { text: `Judge0 unreachable: ${runner.error ?? 'no answer'}`, tone: 'text-critical' }
  const share = runner.usage.limit ? Math.min(1, runner.usage.today / runner.usage.limit) : 0
  return (
    <section aria-labelledby="runner-heading" className="mb-12 rounded-2xl bg-raised p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="runner-heading" className="text-base font-medium">
          Code runner
        </h2>
        <span className={`text-sm ${status.tone}`}>{status.text}</span>
      </div>
      <dl className="mt-5 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-faint">Python</dt>
          <dd className="mt-1 text-ink">
            {runner.python?.name ?? (runner.devPython ? 'Pyodide (local only)' : 'Not available')}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">JavaScript and TypeScript</dt>
          <dd className="mt-1 text-ink">
            {runner.javascriptRunsOn === 'judge0'
              ? `${runner.javascript?.name} on the code runner`
              : 'QuickJS sandbox in the app'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">Runner calls today</dt>
          <dd className="mt-1 text-ink tabular-nums">
            {runner.usage.today} of {runner.usage.limit}
          </dd>
          <div
            className="mt-2 h-1 overflow-hidden rounded-full bg-pill"
            role="meter"
            aria-label="Share of today's runner allowance used"
            aria-valuemin={0}
            aria-valuemax={runner.usage.limit}
            aria-valuenow={runner.usage.today}
          >
            <div
              className={`h-full rounded-full ${share >= 0.9 ? 'bg-caution' : 'bg-verified'}`}
              style={{ width: `${share * 100}%` }}
            />
          </div>
        </div>
      </dl>
      {runner.provider === 'rapidapi' && (
        <p className="mt-4 text-xs text-ink-faint">
          Using RapidAPI: their plan’s own request quota applies on top of this daily cap.
        </p>
      )}
    </section>
  )
}

function QueueList({
  title,
  rows,
  selected,
  onSelect,
}: {
  title: string
  rows: QueueRow[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <section>
      <h2 className="text-base font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">None.</p>
      ) : (
        <ul className="ruled-list mt-3 border-t border-line">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                aria-current={selected === row.id ? 'true' : undefined}
                className={`w-full py-3 text-left text-sm transition-colors ${selected === row.id ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
              >
                {row.candidate} · {row.skillName}
                <span className="block text-xs text-ink-faint">
                  {row.mode === 'ai_assisted' ? 'AI-assisted' : 'Independent'}
                  {row.submittedAt && ` · ${new Date(row.submittedAt).toLocaleString()}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RevokeForm({ busy, onRevoke }: { busy: boolean; onRevoke: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <label htmlFor="revoke-reason" className="sr-only">
        Reason for revoking
      </label>
      <input
        id="revoke-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (kept in the audit log)"
        className="metalab-input"
      />
      <Button
        variant="danger"
        disabled={busy || reason.trim().length < 10}
        onClick={() => onRevoke(reason)}
      >
        Revoke
      </Button>
    </div>
  )
}
