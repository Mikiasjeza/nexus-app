'use client'

import { useState } from 'react'
import Button from '@/components/UI/Button'
import {
  CERTIFICATION_KINDS,
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  EMPLOYMENT_TYPES,
  labelOf,
} from '@/lib/career/profile-options'
import {
  fmtMonth,
  toMonth,
  type CertificationRow,
  type EducationRow,
  type ExperienceRow,
} from './useCareerProfile'

type Actions = {
  onAdd: (body: unknown) => Promise<void>
  onUpdate: (id: string, body: unknown) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="metalab-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly { id: string; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="metalab-input">
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** List of records with add, edit and delete. Shared by all three kinds. */
function RecordList<T extends { id: string }>({
  rows,
  empty,
  addLabel,
  render,
  form,
  blank,
  toForm,
  actions,
}: {
  rows: T[]
  empty: string
  addLabel: string
  render: (row: T) => React.ReactNode
  form: (draft: Record<string, unknown>, set: (k: string, v: unknown) => void) => React.ReactNode
  blank: Record<string, unknown>
  toForm: (row: T) => Record<string, unknown>
  actions: Actions
}) {
  const [editing, setEditing] = useState<string | null>(null) // id, 'new' or null
  const [draft, setDraft] = useState<Record<string, unknown>>(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const open = (id: string, values: Record<string, unknown>) => {
    setEditing(id)
    setDraft(values)
    setError('')
  }
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      if (editing === 'new') await actions.onAdd(draft)
      else if (editing) await actions.onUpdate(editing, draft)
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (id: string) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    setBusy(true)
    try {
      await actions.onDelete(id)
    } finally {
      setBusy(false)
    }
  }

  const editor = (
    <div className="space-y-4 border border-line p-5">
      {form(draft, (k, v) => setDraft((d) => ({ ...d, [k]: v })))}
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={save} isLoading={busy}>
          Save
        </Button>
        <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {rows.length === 0 && editing !== 'new' && <p className="text-sm text-ink-muted">{empty}</p>}
      <ul className="space-y-3">
        {rows.map((row) =>
          editing === row.id ? (
            <li key={row.id}>{editor}</li>
          ) : (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3"
            >
              <div className="min-w-0">
                {render(row)}
                <p className="mt-1 text-xs text-ink-faint">Self-reported</p>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  className="underline"
                  onClick={() => open(row.id, toForm(row))}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-critical underline"
                  onClick={() => remove(row.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </li>
          )
        )}
      </ul>
      {editing === 'new' ? (
        editor
      ) : (
        <Button variant="secondary" onClick={() => open('new', blank)}>
          {addLabel}
        </Button>
      )}
    </div>
  )
}

const s = (v: unknown) => (typeof v === 'string' ? v : '')

export function EducationEditor({ rows, ...actions }: { rows: EducationRow[] } & Actions) {
  return (
    <RecordList
      rows={rows}
      empty="No education added yet."
      addLabel="Add education"
      actions={actions}
      blank={{
        level: 'bachelor',
        status: 'completed',
        institution: '',
        fieldOfStudy: '',
        startDate: '',
        graduationDate: '',
      }}
      toForm={(r) => ({
        level: r.level,
        status: r.status,
        institution: r.institution ?? '',
        fieldOfStudy: r.fieldOfStudy ?? '',
        startDate: toMonth(r.startDate),
        graduationDate: toMonth(r.graduationDate),
      })}
      render={(r) => (
        <>
          <p className="font-medium">
            {labelOf(EDUCATION_LEVELS, r.level)}
            {r.fieldOfStudy ? `, ${r.fieldOfStudy}` : ''}
          </p>
          <p className="text-sm text-ink-muted">
            {[
              r.institution,
              labelOf(EDUCATION_STATUSES, r.status),
              r.graduationDate &&
                `${r.status === 'completed' ? 'Graduated' : 'Expected'} ${fmtMonth(r.graduationDate)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
      form={(d, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Level">
            <Select
              value={s(d.level)}
              onChange={(v) => set('level', v)}
              options={EDUCATION_LEVELS}
            />
          </Field>
          <Field label="Status">
            <Select
              value={s(d.status)}
              onChange={(v) => set('status', v)}
              options={EDUCATION_STATUSES}
            />
          </Field>
          <Field label="School (optional)">
            <input
              className="metalab-input"
              value={s(d.institution)}
              maxLength={200}
              onChange={(e) => set('institution', e.target.value)}
            />
          </Field>
          <Field label="Major or field (optional)">
            <input
              className="metalab-input"
              value={s(d.fieldOfStudy)}
              maxLength={200}
              onChange={(e) => set('fieldOfStudy', e.target.value)}
            />
          </Field>
          <Field label="Started (optional)">
            <input
              type="month"
              className="metalab-input"
              value={s(d.startDate)}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </Field>
          <Field
            label={
              d.status === 'completed' ? 'Graduated (optional)' : 'Expected graduation (optional)'
            }
          >
            <input
              type="month"
              className="metalab-input"
              value={s(d.graduationDate)}
              onChange={(e) => set('graduationDate', e.target.value)}
            />
          </Field>
        </div>
      )}
    />
  )
}

export function ExperienceEditor({ rows, ...actions }: { rows: ExperienceRow[] } & Actions) {
  return (
    <RecordList
      rows={rows}
      empty="No experience added yet. Internships, freelance, volunteer work and projects all count."
      addLabel="Add experience"
      actions={actions}
      blank={{
        employer: '',
        title: '',
        industry: '',
        employmentType: 'full_time',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
      }}
      toForm={(r) => ({
        employer: r.employer,
        title: r.title,
        industry: r.industry ?? '',
        employmentType: r.employmentType,
        startDate: toMonth(r.startDate),
        endDate: toMonth(r.endDate),
        current: r.current,
        description: r.description ?? '',
      })}
      render={(r) => (
        <>
          <p className="font-medium">
            {r.title} · {r.employer}
          </p>
          <p className="text-sm text-ink-muted">
            {[
              labelOf(EMPLOYMENT_TYPES, r.employmentType),
              r.industry,
              r.startDate &&
                `${fmtMonth(r.startDate)} – ${r.current ? 'now' : fmtMonth(r.endDate) || '?'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
      form={(d, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title or role">
            <input
              className="metalab-input"
              value={s(d.title)}
              maxLength={200}
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>
          <Field label="Employer or organization">
            <input
              className="metalab-input"
              value={s(d.employer)}
              maxLength={200}
              onChange={(e) => set('employer', e.target.value)}
            />
          </Field>
          <Field label="Type">
            <Select
              value={s(d.employmentType)}
              onChange={(v) => set('employmentType', v)}
              options={EMPLOYMENT_TYPES}
            />
          </Field>
          <Field label="Industry (optional)">
            <input
              className="metalab-input"
              value={s(d.industry)}
              maxLength={120}
              onChange={(e) => set('industry', e.target.value)}
            />
          </Field>
          <Field label="Started (optional)">
            <input
              type="month"
              className="metalab-input"
              value={s(d.startDate)}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </Field>
          <Field label="Ended (optional)">
            <input
              type="month"
              className="metalab-input"
              value={s(d.endDate)}
              disabled={Boolean(d.current)}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(d.current)}
              onChange={(e) => set('current', e.target.checked)}
            />
            I work here now
          </label>
          <div className="sm:col-span-2">
            <Field
              label="What you did (optional)"
              hint="Main responsibilities, projects and results."
            >
              <textarea
                className="metalab-input min-h-24 py-3"
                maxLength={2000}
                value={s(d.description)}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}
    />
  )
}

export function CertificationEditor({ rows, ...actions }: { rows: CertificationRow[] } & Actions) {
  return (
    <RecordList
      rows={rows}
      empty="No certifications or licenses added yet."
      addLabel="Add certification or license"
      actions={actions}
      blank={{ name: '', issuer: '', kind: 'certification', issueDate: '', expirationDate: '' }}
      toForm={(r) => ({
        name: r.name,
        issuer: r.issuer ?? '',
        kind: r.kind,
        issueDate: toMonth(r.issueDate),
        expirationDate: toMonth(r.expirationDate),
      })}
      render={(r) => (
        <>
          <p className="font-medium">{r.name}</p>
          <p className="text-sm text-ink-muted">
            {[
              labelOf(CERTIFICATION_KINDS, r.kind),
              r.issuer,
              r.issueDate && `Issued ${fmtMonth(r.issueDate)}`,
              r.expirationDate && `Expires ${fmtMonth(r.expirationDate)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
      form={(d, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className="metalab-input"
              value={s(d.name)}
              maxLength={200}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="Type">
            <Select
              value={s(d.kind)}
              onChange={(v) => set('kind', v)}
              options={CERTIFICATION_KINDS}
            />
          </Field>
          <Field label="Issued by (optional)">
            <input
              className="metalab-input"
              value={s(d.issuer)}
              maxLength={200}
              onChange={(e) => set('issuer', e.target.value)}
            />
          </Field>
          <div />
          <Field label="Issued (optional)">
            <input
              type="month"
              className="metalab-input"
              value={s(d.issueDate)}
              onChange={(e) => set('issueDate', e.target.value)}
            />
          </Field>
          <Field label="Expires (optional)">
            <input
              type="month"
              className="metalab-input"
              value={s(d.expirationDate)}
              onChange={(e) => set('expirationDate', e.target.value)}
            />
          </Field>
        </div>
      )}
    />
  )
}
