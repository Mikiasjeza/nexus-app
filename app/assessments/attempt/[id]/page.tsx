'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import Workspace, { briefTitle, type WorkspaceAdapter } from '@/components/Assessments/Workspace'
import {
  ApiError,
  assessmentsApi,
  type AttemptView,
  type IntegrityEvent,
} from '@/lib/api/assessments'

const FINISHED = ['COMPLETED', 'PENDING_REVIEW', 'FAILED_SYSTEM', 'EXPIRED', 'CANCELLED']

export default function AttemptPage() {
  const id = String(useParams().id ?? '')
  const router = useRouter()
  const [view, setView] = useState<AttemptView | null>(null)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const events = useRef<IntegrityEvent[]>([])

  const accept = useCallback(
    (next: AttemptView) => {
      setOffset(new Date(next.serverNow).getTime() - Date.now())
      if (FINISHED.includes(next.status)) {
        router.replace(
          next.status === 'CANCELLED' ? '/assessments' : `/assessments/result/${next.id}`
        )
        return
      }
      setView(next)
    },
    [router]
  )

  useEffect(() => {
    assessmentsApi
      .attempt(id)
      .then(accept)
      .catch((e: Error) =>
        setError({ message: e.message, status: e instanceof ApiError ? e.status : undefined })
      )
  }, [id, accept])

  // Grading in progress: check back until it settles.
  useEffect(() => {
    if (!view || (view.status !== 'SUBMITTED' && view.status !== 'EVALUATING')) return
    const timer = setInterval(() => {
      assessmentsApi
        .attempt(id)
        .then(accept)
        .catch(() => undefined)
    }, 3000)
    return () => clearInterval(timer)
  }, [view, id, accept])

  // Integrity signals go up in small batches.
  useEffect(() => {
    if (view?.status !== 'IN_PROGRESS') return
    const flush = () => {
      if (events.current.length === 0) return
      const batch = events.current.splice(0, 50)
      assessmentsApi.events(id, batch).catch(() => undefined)
    }
    const timer = setInterval(flush, 5000)
    return () => {
      clearInterval(timer)
      flush()
    }
  }, [view?.status, id])

  const stage = view?.stage
  const adapter = useMemo<WorkspaceAdapter | null>(() => {
    if (!stage) return null
    return {
      practice: false,
      run: (work) => assessmentsApi.run(id, work),
      save: async (work) => {
        await assessmentsApi.saveDraft(id, stage, work)
      },
      submit: async (work) => {
        accept(await assessmentsApi.submit(id, stage, work))
      },
      recordEvent: (event) => {
        events.current.push(event)
      },
      onTimeout: async (work) => {
        await assessmentsApi.saveDraft(id, stage, work).catch(() => undefined)
        accept(await assessmentsApi.timeout(id))
      },
    }
  }, [id, stage, accept])

  const begin = async () => {
    setBusy(true)
    try {
      accept(await assessmentsApi.start(id))
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : 'Could not start' })
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await assessmentsApi.cancel(id)
      router.replace(view ? `/assessments/${view.slug}` : '/assessments')
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : 'Could not cancel' })
      setBusy(false)
    }
  }

  if (error) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title={error.status === 401 ? 'Sign in first' : 'Can’t open this attempt'}
            description={error.message}
          />
          <Link
            href={
              error.status === 401 ? `/auth/login?next=/assessments/attempt/${id}` : '/assessments'
            }
            className="metalab-link"
          >
            {error.status === 401 ? 'Sign in' : 'All assessments'}
          </Link>
        </div>
      </AppPageShell>
    )
  }
  if (!view) return <Loader />

  if (view.status === 'SUBMITTED' || view.status === 'EVALUATING') {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Grading your work"
            description="Your work is running against the hidden tests and being scored against the rubric. This usually takes under a minute."
          />
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  if (view.status === 'READY' || view.status === 'CREATED') {
    const minutes = view.stageMinutes.main + view.stageMinutes.followup + view.stageMinutes.explain
    return (
      <AppPageShell>
        <div className="page-shell max-w-3xl">
          <PageHeader
            title="Before you start"
            description={`${view.title}, ${view.mode === 'ai_assisted' ? 'AI-assisted' : 'independent'}. ${minutes} minutes from the moment you start, in three steps.`}
          />
          <ul className="space-y-3 text-[0.9375rem] leading-relaxed text-ink-muted">
            <li>
              The clock runs on our server and keeps going if you close the tab. Your work saves as
              you type.
            </li>
            <li>Each step locks when you submit it. If time runs out, what you saved is graded.</li>
            {view.mode === 'independent' ? (
              <li>
                Independent: no AI tools and no copying. Pastes and leaving the tab are recorded.
              </li>
            ) : (
              <li>
                AI-assisted: AI tools are fine, but the explanations at the end must be your own
                words.
              </li>
            )}
            <li>Find somewhere quiet. A desktop browser works best.</li>
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button onClick={begin} isLoading={busy}>
              Start the clock
            </Button>
            <Button variant="ghost" onClick={cancel} disabled={busy}>
              Not now, cancel
            </Button>
          </div>
        </div>
      </AppPageShell>
    )
  }

  if (!view.brief || !adapter) return <Loader />

  return (
    <AppPageShell>
      <div className="page-shell !pt-0">
        <Workspace
          key={view.stage}
          title={briefTitle(view.brief)}
          brief={view.brief}
          initialWork={view.draft}
          mode={view.mode}
          deadlineAt={view.deadlineAt}
          clockOffsetMs={offset}
          stageMinutes={view.stageMinutes}
          adapter={adapter}
        />
      </div>
    </AppPageShell>
  )
}
