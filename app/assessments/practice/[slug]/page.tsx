'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import CriteriaList from '@/components/Assessments/CriteriaList'
import Workspace, { briefTitle, type WorkspaceAdapter } from '@/components/Assessments/Workspace'
import {
  assessmentsApi,
  type CatalogEntry,
  type PracticeResult,
  type PublicBrief,
  type Stage,
  type StageWork,
} from '@/lib/api/assessments'

type Saved = { seed: number; stage: Stage; work: Partial<Record<Stage, StageWork>> }

const NEXT: Record<Stage, Stage | null> = { main: 'followup', followup: 'explain', explain: null }
const PREVIOUS: Record<Stage, Stage | null> = { main: null, followup: 'main', explain: 'followup' }

const storageKey = (slug: string) => `nexus-practice:${slug}`

function readSaved(slug: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug))
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

function writeSaved(slug: string, saved: Saved | null) {
  try {
    if (saved) sessionStorage.setItem(storageKey(slug), JSON.stringify(saved))
    else sessionStorage.removeItem(storageKey(slug))
  } catch {
    // Private windows can refuse storage; practice still works, it just won't survive a reload.
  }
}

export default function PracticePage() {
  const slug = String(useParams().slug ?? '')
  const [entry, setEntry] = useState<CatalogEntry | null>(null)
  const [state, setState] = useState<Saved | null>(null)
  const [brief, setBrief] = useState<PublicBrief | null>(null)
  const [result, setResult] = useState<PracticeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)

  useEffect(() => {
    assessmentsApi
      .catalog()
      .then((c) => setEntry(c.assessments.find((a) => a.slug === slug) ?? null))
      .catch(() => undefined)
  }, [slug])

  // Resume this browser's round, or deal a new one.
  useEffect(() => {
    let cancelled = false
    const saved = readSaved(slug)
    const stage = saved?.stage ?? 'main'
    const prev = PREVIOUS[stage]
    assessmentsApi
      .practiceBrief(slug, stage, saved?.seed, prev ? saved?.work[prev] : undefined)
      .then(({ seed, brief: b }) => {
        if (cancelled) return
        const next: Saved = saved ?? { seed, stage: 'main', work: {} }
        writeSaved(slug, next)
        setState(next)
        setBrief(b)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [slug, round])

  const persist = useCallback(
    (next: Saved) => {
      writeSaved(slug, next)
      setState(next)
    },
    [slug]
  )

  const adapter = useMemo<WorkspaceAdapter | null>(() => {
    if (!state) return null
    return {
      practice: true,
      run: (work) => assessmentsApi.practiceRun(slug, state.seed, state.stage, work),
      onLocalChange: (work) =>
        writeSaved(slug, { ...state, work: { ...state.work, [state.stage]: work } }),
      submit: async (work) => {
        const all = { ...state.work, [state.stage]: work }
        const next = NEXT[state.stage]
        if (next) {
          const { brief: b } = await assessmentsApi.practiceBrief(slug, next, state.seed, work)
          persist({ seed: state.seed, stage: next, work: all })
          setBrief(b)
          window.scrollTo({ top: 0 })
          return
        }
        setResult(await assessmentsApi.practiceGrade(slug, state.seed, all))
        writeSaved(slug, null)
        window.scrollTo({ top: 0 })
      },
    }
  }, [slug, state, persist])

  const again = () => {
    writeSaved(slug, null)
    setResult(null)
    setBrief(null)
    setState(null)
    setRound((r) => r + 1)
  }

  if (error) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader title="Practice isn’t available" description={error} />
          <Link href={`/assessments/${slug}`} className="metalab-link">
            Back to the assessment
          </Link>
        </div>
      </AppPageShell>
    )
  }

  if (result) {
    return (
      <AppPageShell>
        <div className="page-shell max-w-4xl">
          <PageHeader
            title="Practice result"
            description="Only the automatic parts were checked. Judged criteria, like code quality and your explanations, are scored in a real attempt."
          />
          <div className="flex flex-wrap items-end gap-x-12 gap-y-6 border-t border-line pt-8">
            <div>
              <p className="display-number text-7xl">{result.checkedScore}%</p>
              <p className="mt-1 text-sm text-ink-muted">of the automatic checks</p>
            </div>
            <ul className="space-y-1.5 text-sm">
              {result.gates.map((gate) => (
                <li key={gate.label} className={gate.met ? 'text-ink-muted' : 'text-caution'}>
                  {gate.met ? 'Met' : 'Below'} the {gate.minimum}% minimum for{' '}
                  {gate.label.toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            <CriteriaList criteria={result.criteria} pendingLabel="Scored in a real attempt" />
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/assessments/${slug}`} className="button-base button-primary">
              Take it for a credential
            </Link>
            <Button variant="secondary" onClick={again}>
              Another practice round
            </Button>
          </div>
        </div>
      </AppPageShell>
    )
  }

  if (!brief || !state || !adapter) return <Loader />

  return (
    <AppPageShell>
      <div className="page-shell !pt-0">
        <Workspace
          key={`${round}:${state.stage}`}
          title={briefTitle(brief)}
          brief={brief}
          initialWork={state.work[state.stage] ?? null}
          mode="independent"
          deadlineAt={null}
          clockOffsetMs={0}
          stageMinutes={entry?.stageMinutes ?? { main: 25, followup: 10, explain: 10 }}
          adapter={adapter}
        />
      </div>
    </AppPageShell>
  )
}
