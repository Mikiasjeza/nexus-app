'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Check, Play, X } from 'lucide-react'
import Button from '@/components/UI/Button'
import Modal from '@/components/UI/Modal'
import type { IntegrityEvent, PracticeRun, PublicBrief, StageWork } from '@/lib/api/assessments'
import type { AssessmentMode, Stage } from '@/lib/assessments/types'
import type { EditorLanguage } from './CodeEditor'
import { formatValue } from '@/lib/assessments/format'

const CodeEditor = dynamic(() => import('./CodeEditor'), {
  ssr: false,
  loading: () => <div className="min-h-[18rem] rounded-xl bg-raised" aria-hidden />,
})

export interface WorkspaceAdapter {
  practice: boolean
  run: (work: StageWork) => Promise<PracticeRun>
  /** Autosave. Omitted in practice, where work stays in the browser. */
  save?: (work: StageWork) => Promise<void>
  submit: (work: StageWork) => Promise<void>
  recordEvent?: (event: IntegrityEvent) => void
  /** Called once when the clock reaches zero, with the work as it stands. */
  onTimeout?: (work: StageWork) => void
  /** Practice keeps work across reloads in the browser. */
  onLocalChange?: (work: StageWork) => void
}

interface WorkspaceProps {
  title: string
  brief: PublicBrief
  initialWork: StageWork | null
  mode: AssessmentMode
  deadlineAt: string | null
  /** serverNow minus the browser's clock, so the timer follows the server. */
  clockOffsetMs: number
  stageMinutes: { main: number; followup: number; explain: number }
  adapter: WorkspaceAdapter
}

const STAGE_LABELS: Record<Stage, string> = {
  main: 'The task',
  followup: 'Follow-up',
  explain: 'Explain',
}

function startingWork(brief: PublicBrief, saved: StageWork | null): StageWork {
  if (brief.stage === 'explain') {
    const count = brief.explainQuestions?.length ?? 0
    const answers = saved?.answers ?? []
    return { answers: Array.from({ length: count }, (_, i) => answers[i] ?? '') }
  }
  if (brief.workspace === 'code') return { code: saved?.code ?? brief.starter ?? '' }
  if (brief.workspace === 'sql')
    return { queries: { ...(brief.starterQueries ?? {}), ...(saved?.queries ?? {}) } }
  return { text: saved?.text ?? brief.starter ?? '' }
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/** "Python · Log triage" for coding challenges; the brief's own title otherwise. */
export function briefTitle(brief: PublicBrief): string {
  return brief.workspace === 'code' ? `${brief.skillName} · ${brief.title}` : brief.title
}

export default function Workspace({
  title,
  brief,
  initialWork,
  mode,
  deadlineAt,
  clockOffsetMs,
  stageMinutes,
  adapter,
}: WorkspaceProps) {
  const [work, setWork] = useState<StageWork>(() => startingWork(brief, initialWork))
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [running, setRunning] = useState<string | null>(null)
  const [codeRun, setCodeRun] = useState<Extract<PracticeRun, { kind: 'code' }>['report'] | null>(
    null
  )
  const [sqlRuns, setSqlRuns] = useState<
    Record<string, Extract<PracticeRun, { kind: 'sql' }>['results'][number]>
  >({})
  const [runError, setRunError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const workRef = useRef(work)
  workRef.current = work

  const stageIndex = ['main', 'followup', 'explain'].indexOf(brief.stage)
  const language: EditorLanguage =
    brief.workspace === 'sql'
      ? 'sql'
      : ((brief.language as EditorLanguage | undefined) ?? 'javascript')

  // ── Autosave ──────────────────────────────────────────────────────────
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    adapter.onLocalChange?.(work)
    if (!adapter.save) return
    setSaveState('unsaved')
    const timer = setTimeout(() => {
      setSaveState('saving')
      adapter.save!(work)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, 1500)
    return () => clearTimeout(timer)
  }, [work, adapter])

  // ── Integrity signals ─────────────────────────────────────────────────
  const onPaste = useCallback(
    (chars: number) => adapter.recordEvent?.({ type: 'paste', chars }),
    [adapter]
  )
  useEffect(() => {
    if (!adapter.recordEvent) return
    const onVisibility = () =>
      adapter.recordEvent?.({ type: document.visibilityState === 'hidden' ? 'hidden' : 'visible' })
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [adapter])

  // ── Runs ──────────────────────────────────────────────────────────────
  const runCode = async () => {
    setRunning('code')
    setRunError(null)
    try {
      const result = await adapter.run(workRef.current)
      if (result.kind === 'code') setCodeRun(result.report)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'The run failed')
    } finally {
      setRunning(null)
    }
  }

  const runQuery = async (taskId: string) => {
    setRunning(taskId)
    setRunError(null)
    try {
      const query = workRef.current.queries?.[taskId] ?? ''
      const result = await adapter.run({ queries: { [taskId]: query } })
      if (result.kind === 'sql') {
        const found = result.results.find((r) => r.id === taskId)
        if (found) setSqlRuns((prev) => ({ ...prev, [taskId]: found }))
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'The run failed')
    } finally {
      setRunning(null)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────
  const submit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await adapter.submit(workRef.current)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit')
      setSubmitting(false)
      return
    }
    setConfirming(false)
  }

  const incomplete = useMemo(() => {
    if (brief.stage === 'explain') return (work.answers ?? []).some((a) => wordCount(a) < 5)
    if (brief.workspace === 'sql') {
      return (brief.sql?.tasks ?? []).some((task) => !(work.queries?.[task.id] ?? '').trim())
    }
    if (brief.workspace === 'writing')
      return wordCount(work.text ?? '') < (brief.writing?.minWords ?? 0)
    return !(work.code ?? '').trim()
  }, [brief, work])

  return (
    <div className="pb-24">
      {/* Bar: where you are, how long is left, and the one action that matters. */}
      {/* Reaches up behind the floating site header so nothing shows through above it. */}
      <div className="sticky top-0 z-30 -mx-[clamp(1rem,4vw,3rem)] -mt-20 mb-8 border-b border-line bg-ground/95 px-[clamp(1rem,4vw,3rem)] pb-3 pt-[5.75rem] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-muted">
              {title}
              {adapter.practice
                ? ' · Practice'
                : mode === 'ai_assisted'
                  ? ' · AI-assisted'
                  : ' · Independent'}
            </p>
            <ol className="mt-1 flex items-center gap-1 text-sm" aria-label="Steps">
              {(['main', 'followup', 'explain'] as Stage[]).map((s, i) => (
                <li key={s} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="text-ink-faint" aria-hidden>
                      ·
                    </span>
                  )}
                  <span
                    aria-current={s === brief.stage ? 'step' : undefined}
                    className={
                      s === brief.stage
                        ? 'text-ink'
                        : i < stageIndex
                          ? 'text-ink-muted'
                          : 'text-ink-faint'
                    }
                  >
                    {i < stageIndex && <Check className="mr-0.5 inline h-3.5 w-3.5" aria-hidden />}
                    {STAGE_LABELS[s]}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-center gap-4">
            {adapter.save && <SaveStatus state={saveState} />}
            {deadlineAt ? (
              <Countdown
                deadlineAt={deadlineAt}
                offsetMs={clockOffsetMs}
                onZero={adapter.onTimeout ? () => adapter.onTimeout!(workRef.current) : undefined}
              />
            ) : (
              <span className="text-sm text-ink-faint">
                About {stageMinutes[brief.stage]} min for this step
              </span>
            )}
            <Button onClick={() => setConfirming(true)} disabled={submitting}>
              {brief.stage === 'explain' ? 'Finish' : 'Submit step'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-8">
          <section aria-labelledby="brief-heading">
            <h2 id="brief-heading" className="text-base font-medium">
              {STAGE_LABELS[brief.stage]}
            </h2>
            <ol className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-muted">
              {brief.instructions.map((line, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-ink-faint tabular-nums">{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            {brief.runtime && brief.stage !== 'explain' && (
              <p className="mt-5 text-sm text-ink-faint">Runs on {brief.runtime}.</p>
            )}
            {!adapter.practice && mode === 'independent' && brief.stage !== 'explain' && (
              <p className="mt-5 text-sm text-ink-faint">
                Independent mode: your own work only. Pastes and tab switches are recorded.
              </p>
            )}
          </section>

          {brief.writing && brief.stage !== 'explain' && (
            <section aria-labelledby="facts-heading">
              <h2 id="facts-heading" className="text-base font-medium">
                The facts
              </h2>
              <ul className="ruled-list mt-3 text-sm">
                {brief.writing.facts.map((fact) => (
                  <li key={fact} className="py-2.5 text-ink-muted">
                    {fact}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {brief.visibleTests && brief.stage !== 'explain' && (
            <section aria-labelledby="examples-heading">
              <h2 id="examples-heading" className="text-base font-medium">
                Examples
              </h2>
              <p className="mt-1 text-sm text-ink-faint">
                Hidden tests decide the score; these show the format.
              </p>
              <ul className="ruled-list mt-3">
                {brief.visibleTests.map((test) => (
                  <li key={test.id} className="py-3">
                    <details>
                      <summary className="cursor-pointer text-sm text-ink">
                        {test.description}
                      </summary>
                      <p className="mt-3 text-xs text-ink-faint">Input</p>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-raised p-3 text-xs text-ink-muted">
                        {formatValue(test.args[0], brief.language)}
                      </pre>
                      <p className="mt-3 text-xs text-ink-faint">Returns</p>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-raised p-3 text-xs text-ink-muted">
                        {formatValue(test.expected, brief.language)}
                      </pre>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {brief.sql && brief.stage !== 'explain' && <SqlSchema sql={brief.sql} />}
        </aside>

        <section className="min-w-0 space-y-6" aria-label="Your work">
          {runError && (
            <p role="alert" className="rounded-xl bg-critical/10 px-4 py-3 text-sm text-[#ffc9c9]">
              {runError}
            </p>
          )}

          {brief.stage === 'explain' ? (
            <ExplainStage
              brief={brief}
              language={language}
              answers={work.answers ?? []}
              onChange={(answers) => setWork({ answers })}
              onPaste={onPaste}
            />
          ) : brief.workspace === 'code' ? (
            <>
              <CodeEditor
                value={work.code ?? ''}
                onChange={(code) => setWork({ code })}
                language={language}
                onPaste={onPaste}
                minHeight="26rem"
                ariaLabel={`${title} code editor`}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={runCode}
                  isLoading={running === 'code'}
                  leftIcon={<Play className="h-4 w-4" />}
                >
                  Run examples
                </Button>
                {codeRun && (
                  <span className="text-sm text-ink-muted">
                    {codeRun.error
                      ? 'The code did not run'
                      : `${codeRun.outcomes.filter((o) => o.passed).length} of ${codeRun.outcomes.length} examples match`}
                  </span>
                )}
              </div>
              {codeRun && (
                <CodeRunOutput
                  report={codeRun}
                  tests={brief.visibleTests ?? []}
                  language={brief.language}
                />
              )}
            </>
          ) : brief.workspace === 'sql' ? (
            <div className="space-y-10">
              {(brief.sql?.tasks ?? []).map((task, i) => (
                <div key={task.id}>
                  <p className="text-[0.9375rem] leading-relaxed">
                    <span className="mr-2 text-ink-faint tabular-nums">{i + 1}</span>
                    {task.prompt}
                  </p>
                  <div className="mt-3">
                    <CodeEditor
                      value={work.queries?.[task.id] ?? ''}
                      onChange={(query) =>
                        setWork((prev) => ({ queries: { ...prev.queries, [task.id]: query } }))
                      }
                      language="sql"
                      onPaste={onPaste}
                      minHeight="7rem"
                      ariaLabel={`Query for task ${i + 1}`}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => runQuery(task.id)}
                      isLoading={running === task.id}
                      leftIcon={<Play className="h-3.5 w-3.5" />}
                    >
                      Run query
                    </Button>
                  </div>
                  {sqlRuns[task.id] && <SqlResultTable result={sqlRuns[task.id]} />}
                </div>
              ))}
            </div>
          ) : (
            <WritingEditor
              value={work.text ?? ''}
              onChange={(text) => setWork({ text })}
              onPaste={onPaste}
              minWords={brief.writing?.minWords ?? 0}
              maxWords={brief.writing?.maxWords ?? 0}
            />
          )}
        </section>
      </div>

      <Modal
        isOpen={confirming}
        onClose={() => !submitting && setConfirming(false)}
        title={brief.stage === 'explain' ? 'Finish the assessment?' : 'Submit this step?'}
        size="sm"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
          {brief.stage === 'explain'
            ? adapter.practice
              ? 'Your practice round will be checked. Nothing is saved or shared.'
              : 'Your work will be graded. This can take up to a minute.'
            : 'This step locks once submitted, and the next one begins. You can’t come back to it.'}
        </p>
        {incomplete && (
          <p className="mt-4 text-sm text-caution">
            {brief.stage === 'explain'
              ? 'Some answers are very short.'
              : brief.workspace === 'writing'
                ? 'The text is shorter than asked.'
                : 'Some of the work is still empty.'}
          </p>
        )}
        {submitError && (
          <p role="alert" className="mt-4 text-sm text-[#ffc9c9]">
            {submitError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
            Keep working
          </Button>
          <Button onClick={submit} isLoading={submitting}>
            {brief.stage === 'explain' ? 'Finish' : 'Submit step'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function SaveStatus({ state }: { state: 'saved' | 'saving' | 'unsaved' | 'error' }) {
  const label = {
    saved: 'Saved',
    saving: 'Saving…',
    unsaved: 'Saving…',
    error: 'Not saved, retrying',
  }[state]
  return (
    <span
      className={`text-sm ${state === 'error' ? 'text-caution' : 'text-ink-faint'}`}
      aria-live="polite"
    >
      {label}
    </span>
  )
}

function Countdown({
  deadlineAt,
  offsetMs,
  onZero,
}: {
  deadlineAt: string
  offsetMs: number
  onZero?: () => void
}) {
  const deadline = useMemo(() => new Date(deadlineAt).getTime(), [deadlineAt])
  const [now, setNow] = useState(() => Date.now() + offsetMs)
  const fired = useRef(false)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offsetMs), 1000)
    return () => clearInterval(id)
  }, [offsetMs])
  const left = Math.max(0, deadline - now)
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true
      onZero?.()
    }
  }, [left, onZero])
  const minutes = Math.floor(left / 60_000)
  const seconds = Math.floor((left % 60_000) / 1000)
  const low = left < 5 * 60_000
  return (
    <span
      className={`display-number text-2xl ${low ? 'text-caution' : 'text-ink'}`}
      role="timer"
      aria-label={`${minutes} minutes ${seconds} seconds left`}
    >
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  )
}

function CodeRunOutput({
  report,
  tests,
  language,
}: {
  report: Extract<PracticeRun, { kind: 'code' }>['report']
  tests: NonNullable<PublicBrief['visibleTests']>
  language?: string
}) {
  return (
    <div className="space-y-4">
      {report.error && (
        <pre className="whitespace-pre-wrap rounded-xl bg-critical/10 p-4 text-sm text-[#ffc9c9]">
          {report.error}
        </pre>
      )}
      {report.outcomes.length > 0 && (
        <ul className="ruled-list rounded-xl bg-raised px-4">
          {report.outcomes.map((outcome) => {
            const test = tests.find((t) => t.id === outcome.id)
            return (
              <li key={outcome.id} className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  {outcome.passed ? (
                    <Check className="h-4 w-4 text-verified-ink" aria-hidden />
                  ) : (
                    <X className="h-4 w-4 text-critical" aria-hidden />
                  )}
                  <span>{test?.description ?? outcome.id}</span>
                  <span className="sr-only">{outcome.passed ? 'matches' : 'does not match'}</span>
                </div>
                {!outcome.passed && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-ink-faint">Expected</p>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-ground p-3 text-xs text-ink-muted">
                        {formatValue(test?.expected, language)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-ink-faint">
                        {outcome.error ? 'Error' : 'Your code returned'}
                      </p>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-ground p-3 text-xs text-ink-muted">
                        {outcome.error ?? formatValue(outcome.actual, language)}
                      </pre>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {report.logs && (
        <div>
          <p className="text-xs text-ink-faint">Console</p>
          <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-raised p-3 text-xs text-ink-muted">
            {report.logs}
          </pre>
        </div>
      )}
    </div>
  )
}

function SqlSchema({ sql }: { sql: NonNullable<PublicBrief['sql']> }) {
  return (
    <section aria-labelledby="schema-heading" className="space-y-6">
      <h2 id="schema-heading" className="text-base font-medium">
        Tables
      </h2>
      {sql.tables.map((table) => (
        <div key={table.name}>
          <p className="font-mono text-sm text-ink">{table.name}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {table.columns.map((column) => (
              <li key={column.name} className="flex flex-wrap gap-x-2 text-ink-muted">
                <span className="font-mono text-ink">{column.name}</span>
                <span className="text-ink-faint">{column.type}</span>
                {column.note && <span className="text-ink-faint">· {column.note}</span>}
              </li>
            ))}
          </ul>
          {sql.sample[table.name]?.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-ink-muted">First rows</summary>
              <div className="mt-2 overflow-x-auto rounded-lg bg-raised">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      {table.columns.map((c) => (
                        <th key={c.name} className="px-3 py-2 font-normal text-ink-faint">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sql.sample[table.name].map((row, i) => (
                      <tr key={i} className="border-t border-line">
                        {row.map((cell, j) => (
                          <td key={j} className="whitespace-nowrap px-3 py-1.5 text-ink-muted">
                            {cell === null ? (
                              <span className="text-ink-faint">NULL</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      ))}
    </section>
  )
}

function SqlResultTable({
  result,
}: {
  result: Extract<PracticeRun, { kind: 'sql' }>['results'][number]
}) {
  if (result.error) {
    return (
      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-critical/10 p-3 text-sm text-[#ffc9c9]">
        {result.error}
      </pre>
    )
  }
  const rows = result.rows ?? []
  return (
    <div className="mt-3 overflow-x-auto rounded-xl bg-raised">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            {(result.columns ?? []).map((c) => (
              <th key={c} className="px-3 py-2 font-normal text-ink-faint">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {row.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-1.5 tabular-nums text-ink-muted">
                  {cell === null ? <span className="text-ink-faint">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs text-ink-faint">
        {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        {rows.length >= 50 ? ' (first 50 shown)' : ''}
      </p>
    </div>
  )
}

function WritingEditor({
  value,
  onChange,
  onPaste,
  minWords,
  maxWords,
}: {
  value: string
  onChange: (value: string) => void
  onPaste: (chars: number) => void
  minWords: number
  maxWords: number
}) {
  const words = wordCount(value)
  const outside = words > 0 && (words < minWords || words > maxWords)
  return (
    <div>
      <label htmlFor="writing-answer" className="metalab-label">
        Your email
      </label>
      <textarea
        id="writing-answer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => onPaste(e.clipboardData.getData('text').length)}
        rows={18}
        spellCheck
        className="metalab-input min-h-[24rem] resize-y text-[0.9375rem] leading-relaxed"
        placeholder="Hi …"
      />
      <p className={`mt-2 text-sm tabular-nums ${outside ? 'text-caution' : 'text-ink-faint'}`}>
        {words} words · aim for {minWords}–{maxWords}
      </p>
    </div>
  )
}

function ExplainStage({
  brief,
  language,
  answers,
  onChange,
  onPaste,
}: {
  brief: PublicBrief
  language: EditorLanguage
  answers: string[]
  onChange: (answers: string[]) => void
  onPaste: (chars: number) => void
}) {
  const queries = Object.entries(brief.starterQueries ?? {})
  return (
    <div className="space-y-8">
      <details className="rounded-xl bg-raised p-4">
        <summary className="cursor-pointer text-sm text-ink-muted">Your submitted work</summary>
        <div className="mt-4">
          {brief.workspace === 'sql' ? (
            <div className="space-y-4">
              {queries.map(([id, query]) => (
                <div key={id}>
                  <p className="text-xs text-ink-faint">{id}</p>
                  <pre className="mt-1 overflow-auto rounded-lg bg-ground p-3 text-xs text-ink-muted">
                    {query}
                  </pre>
                </div>
              ))}
            </div>
          ) : brief.workspace === 'code' ? (
            <CodeEditor
              value={brief.starter ?? ''}
              language={language}
              readOnly
              minHeight="8rem"
              maxHeight="24rem"
              ariaLabel="Your submitted code"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
              {brief.starter}
            </p>
          )}
        </div>
      </details>
      {(brief.explainQuestions ?? []).map((question, i) => (
        <div key={question}>
          <label
            htmlFor={`answer-${i}`}
            className="block text-[0.9375rem] leading-relaxed text-ink"
          >
            <span className="mr-2 text-ink-faint tabular-nums">{i + 1}</span>
            {question}
          </label>
          <textarea
            id={`answer-${i}`}
            value={answers[i] ?? ''}
            onChange={(e) => {
              const next = [...answers]
              next[i] = e.target.value
              onChange(next)
            }}
            onPaste={(e) => onPaste(e.clipboardData.getData('text').length)}
            rows={5}
            className="metalab-input mt-3 resize-y leading-relaxed"
          />
        </div>
      ))}
    </div>
  )
}
