/**
 * Browser client for the assessment API. Unlike fetchApi, a 401 here does
 * not redirect: guests can browse the catalog and take practice rounds.
 */

import type { PracticeRun } from '@/lib/assessments/engine'
import type { AttemptView, ResultView, gradePractice } from '@/lib/assessments/service'
import type { PublicCredential } from '@/lib/assessments/verify'
import type { AssessmentMode, PublicBrief, Stage, StageWork } from '@/lib/assessments/types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || res.statusText || 'Request failed',
      res.status
    )
  }
  return data as T
}

const post = <T>(path: string, body: unknown = {}) =>
  call<T>(path, { method: 'POST', body: JSON.stringify(body) })

export interface CatalogEntry {
  slug: string
  skillName: string
  category: string
  title: string
  level: string
  summary: string
  measures: string[]
  workspace: string
  language: string | null
  minutes: number
  stageMinutes: { main: number; followup: number; explain: number }
  modes: AssessmentMode[]
  available: boolean
  credentialValidMonths: number
  rubric: {
    id: string
    version: number
    passThreshold: number
    criteria: { label: string; weight: number; description: string; automatic: boolean }[]
  }
  personal: {
    openAttempt: { id: string; status: string } | null
    latest: { id: string; status: string; result: string | null; completedAt: string | null } | null
    credential: { id: string; mode: AssessmentMode; expiresAt: string } | null
    retake: { allowed: boolean; reason: string | null; nextAt: string | null }
  } | null
}

export interface Catalog {
  signedIn: boolean
  guest: boolean
  personalError: string | null
  rules: string[]
  retakePolicy: { cooldownHours: number; maxAttempts: number; windowDays: number }
  modes: Record<AssessmentMode, { label: string; description: string }>
  assessments: CatalogEntry[]
}

export type PracticeResult = Awaited<ReturnType<typeof gradePractice>>

export type {
  AttemptView,
  PracticeRun,
  PublicBrief,
  PublicCredential,
  ResultView,
  Stage,
  StageWork,
}

export interface IntegrityEvent {
  type: 'paste' | 'hidden' | 'visible' | 'copy'
  chars?: number
}

export const assessmentsApi = {
  catalog: () => call<Catalog>('/api/assessments'),
  create: (slug: string, mode: AssessmentMode) =>
    post<{ id: string; status: string }>('/api/assessments/attempts', { slug, mode }),
  attempt: (id: string) => call<AttemptView>(`/api/assessments/attempts/${id}`),
  start: (id: string) => post<AttemptView>(`/api/assessments/attempts/${id}/start`),
  saveDraft: (id: string, stage: Stage, work: StageWork) =>
    post<{ saved: boolean; at: string }>(`/api/assessments/attempts/${id}/draft`, { stage, work }),
  run: (id: string, work: StageWork) =>
    post<PracticeRun>(`/api/assessments/attempts/${id}/run`, { work }),
  events: (id: string, events: IntegrityEvent[]) =>
    post<{ accepted: number }>(`/api/assessments/attempts/${id}/events`, { events }),
  submit: (id: string, stage: Stage, work: StageWork) =>
    post<AttemptView>(`/api/assessments/attempts/${id}/submit`, { stage, work }),
  timeout: (id: string) => post<AttemptView>(`/api/assessments/attempts/${id}/timeout`),
  cancel: (id: string) => post<{ status: string }>(`/api/assessments/attempts/${id}/cancel`),
  result: (id: string) => call<ResultView>(`/api/assessments/attempts/${id}/result`),
  appeal: (id: string, reason: string) =>
    post<{ id: string; status: string }>(`/api/assessments/attempts/${id}/appeal`, { reason }),

  practiceBrief: (slug: string, stage: Stage, seed?: number, previous?: StageWork) =>
    post<{ seed: number; brief: PublicBrief }>('/api/assessments/practice/brief', {
      slug,
      stage,
      seed,
      previous,
    }),
  practiceRun: (slug: string, seed: number, stage: Stage, work: StageWork) =>
    post<PracticeRun>('/api/assessments/practice/run', { slug, seed, stage, work }),
  practiceGrade: (slug: string, seed: number, work: Partial<Record<Stage, StageWork>>) =>
    post<PracticeResult>('/api/assessments/practice/grade', { slug, seed, work }),

  verify: (id: string) => call<PublicCredential>(`/api/verify/${encodeURIComponent(id)}`),
}
