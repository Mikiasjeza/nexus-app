'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import Button from '@/components/UI/Button'

type Tracked = {
  id: string
  jobRef: string | null
  title: string
  company: string
  location: string | null
  url: string | null
  status: string
  appliedAt: string | null
  nextStep: string | null
  notes: string | null
  updatedAt: string
}

const STATUSES = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Not selected' },
  { id: 'withdrawn', label: 'Withdrawn' },
]

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

/** Saved jobs and an application tracker in one list. Private to you. */
export default function JobTracker() {
  const [jobs, setJobs] = useState<Tracked[] | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', company: '', url: '', status: 'applied' })
  const [notesOpen, setNotesOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setJobs((await call('/api/jobs/tracker', 'GET')).jobs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const update = async (id: string, patch: Partial<Tracked>) => {
    setError('')
    try {
      await call(`/api/jobs/tracker/${id}`, 'PATCH', patch)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    }
  }
  const remove = async (id: string) => {
    if (!window.confirm('Remove this job from your list?')) return
    await call(`/api/jobs/tracker/${id}`, 'DELETE').catch(() => {})
    await load()
  }
  const add = async () => {
    setError('')
    try {
      await call('/api/jobs/tracker', 'POST', draft)
      setDraft({ title: '', company: '', url: '', status: 'applied' })
      setAdding(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add')
    }
  }

  if (!jobs) return error ? <p className="text-sm text-critical">{error}</p> : null

  const saved = jobs.filter((j) => j.status === 'saved')
  const tracked = jobs.filter((j) => j.status !== 'saved')
  const row = (j: Tracked) => (
    <li key={j.id} className="border-b border-line py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {j.url ? (
              <a
                href={j.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                {j.title}
              </a>
            ) : (
              j.title
            )}
          </p>
          <p className="text-sm text-ink-muted">
            {[
              j.company,
              j.location,
              j.appliedAt &&
                `applied ${formatDistanceToNowStrict(new Date(j.appliedAt), { addSuffix: true })}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {j.nextStep && <p className="mt-1 text-sm">Next: {j.nextStep}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor={`status-${j.id}`}>
            Status
          </label>
          <select
            id={`status-${j.id}`}
            className="metalab-input w-auto py-1.5 text-sm"
            value={j.status}
            onChange={(e) => update(j.id, { status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setNotesOpen(notesOpen === j.id ? null : j.id)}
          >
            Notes
          </button>
          <button
            type="button"
            className="text-sm text-critical underline"
            onClick={() => remove(j.id)}
          >
            Remove
          </button>
        </div>
      </div>
      {notesOpen === j.id && (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            update(j.id, {
              nextStep: String(f.get('nextStep') ?? ''),
              notes: String(f.get('notes') ?? ''),
            })
            setNotesOpen(null)
          }}
        >
          <input
            name="nextStep"
            defaultValue={j.nextStep ?? ''}
            maxLength={300}
            placeholder="Next step, e.g. Interview Tue 2pm"
            className="metalab-input"
          />
          <textarea
            name="notes"
            defaultValue={j.notes ?? ''}
            maxLength={2000}
            placeholder="Notes"
            className="metalab-input min-h-11 py-2 sm:col-span-2"
          />
          <div>
            <Button type="submit" size="sm">
              Save notes
            </Button>
          </div>
        </form>
      )}
    </li>
  )

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
      <div>
        <p className="text-sm font-medium">Saved jobs ({saved.length})</p>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Tap “Save job” on any job in the marketplace to keep it here.
          </p>
        ) : (
          <ul className="mt-2 border-y border-line">{saved.map(row)}</ul>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">Applications ({tracked.length})</p>
        {tracked.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Set a saved job to “Applied”, or add one you applied to elsewhere.
          </p>
        ) : (
          <ul className="mt-2 border-y border-line">{tracked.map(row)}</ul>
        )}
        {adding ? (
          <div className="mt-4 grid gap-2 border border-line p-4 sm:grid-cols-2">
            <input
              className="metalab-input"
              placeholder="Job title"
              maxLength={200}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <input
              className="metalab-input"
              placeholder="Company"
              maxLength={200}
              value={draft.company}
              onChange={(e) => setDraft({ ...draft, company: e.target.value })}
            />
            <input
              className="metalab-input"
              placeholder="Link (optional)"
              maxLength={1000}
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
            <select
              className="metalab-input"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={add}>Add</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button className="mt-4" variant="secondary" onClick={() => setAdding(true)}>
            Add an application
          </Button>
        )}
      </div>
    </div>
  )
}
