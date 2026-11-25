'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/UI/Button'
import { JOB_TYPES, labelOf } from '@/lib/career/profile-options'

type Alert = {
  id: string
  roles: string[]
  locations: string[]
  salaryMin: number | null
  jobTypes: string[]
  remoteOnly: boolean
  frequency: 'daily' | 'weekly'
  enabled: boolean
  lastSentAt: string | null
}

const split = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

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

/** Create and manage email job alerts. */
export default function JobAlerts() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [emailReady, setEmailReady] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    roles: '',
    locations: '',
    salaryMin: '',
    jobTypes: [] as string[],
    remoteOnly: false,
    frequency: 'weekly',
  })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await call('/api/jobs/alerts', 'GET')
      setAlerts(data.alerts)
      setEmailReady(data.emailReady)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load alerts')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      await call('/api/jobs/alerts', 'POST', {
        roles: split(form.roles),
        locations: split(form.locations),
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        jobTypes: form.jobTypes,
        remoteOnly: form.remoteOnly,
        frequency: form.frequency,
      })
      setForm({
        roles: '',
        locations: '',
        salaryMin: '',
        jobTypes: [],
        remoteOnly: false,
        frequency: 'weekly',
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the alert')
    } finally {
      setBusy(false)
    }
  }
  const patch = async (id: string, body: Partial<Alert>) => {
    await call(`/api/jobs/alerts/${id}`, 'PATCH', body).catch((e) => setError(e.message))
    await load()
  }
  const remove = async (id: string) => {
    if (!window.confirm('Delete this alert?')) return
    await call(`/api/jobs/alerts/${id}`, 'DELETE').catch(() => {})
    await load()
  }

  return (
    <div className="space-y-6">
      {!emailReady && (
        <p className="text-sm text-caution">
          Email isn&apos;t switched on yet, so alerts will start once it is.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
      {alerts && alerts.length > 0 && (
        <ul className="border-y border-line">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-4 last:border-b-0"
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium">{a.roles.join(', ') || 'Any role'}</p>
                <p className="text-ink-muted">
                  {[
                    a.remoteOnly ? 'Remote only' : a.locations.join(', '),
                    a.jobTypes.map((t) => labelOf(JOB_TYPES, t)).join('/'),
                    a.salaryMin && `$${a.salaryMin.toLocaleString()}+`,
                    a.frequency === 'daily' ? 'Daily' : 'Weekly',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={(e) => patch(a.id, { enabled: e.target.checked })}
                  />
                  On
                </label>
                <select
                  aria-label="How often"
                  className="metalab-input w-auto py-1.5 text-sm"
                  value={a.frequency}
                  onChange={(e) => patch(a.id, { frequency: e.target.value as Alert['frequency'] })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button
                  type="button"
                  className="text-critical underline"
                  onClick={() => remove(a.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 border border-line p-5 sm:grid-cols-2">
        <p className="font-medium sm:col-span-2">New alert</p>
        <input
          className="metalab-input"
          placeholder="Roles, e.g. Data Analyst, Accountant"
          maxLength={300}
          value={form.roles}
          onChange={(e) => setForm({ ...form, roles: e.target.value })}
        />
        <input
          className="metalab-input"
          placeholder="Locations, e.g. Austin, Remote"
          maxLength={300}
          value={form.locations}
          onChange={(e) => setForm({ ...form, locations: e.target.value })}
        />
        <input
          className="metalab-input"
          type="number"
          min={0}
          step={5000}
          placeholder="Minimum salary (optional)"
          value={form.salaryMin}
          onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
        />
        <select
          aria-label="How often"
          className="metalab-input"
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
        >
          <option value="weekly">Weekly email</option>
          <option value="daily">Daily email</option>
        </select>
        <div className="flex flex-wrap gap-2 sm:col-span-2" role="group" aria-label="Job types">
          {JOB_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="pill"
              aria-pressed={form.jobTypes.includes(t.id)}
              onClick={() =>
                setForm({
                  ...form,
                  jobTypes: form.jobTypes.includes(t.id)
                    ? form.jobTypes.filter((x) => x !== t.id)
                    : [...form.jobTypes, t.id],
                })
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.remoteOnly}
            onChange={(e) => setForm({ ...form, remoteOnly: e.target.checked })}
          />
          Remote jobs only
        </label>
        <div className="sm:col-span-2">
          <Button onClick={create} isLoading={busy}>
            Create alert
          </Button>
          <p className="mt-2 text-xs text-ink-faint">
            You&apos;ll only get jobs you haven&apos;t been sent before. Every email has an
            unsubscribe link.
          </p>
        </div>
      </div>
    </div>
  )
}
