'use client'

import { useRef, useState } from 'react'
import Button from '@/components/UI/Button'
import {
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  EMPLOYMENT_TYPES,
  labelOf,
} from '@/lib/career/profile-options'

type Draft = {
  education: {
    institution: string | null
    level: string
    fieldOfStudy: string | null
    status: string
    startDate?: string | null
    graduationDate?: string | null
  }[]
  experience: {
    employer: string
    title: string
    industry: string | null
    employmentType: string
    startDate?: string | null
    endDate?: string | null
    current: boolean
    description: string | null
  }[]
  certifications: {
    name: string
    issuer: string | null
    kind: string
    issueDate?: string | null
    expirationDate?: string | null
  }[]
  skills: string[]
}

type Kind = 'education' | 'experience' | 'certifications' | 'skills'
const key = (kind: Kind, i: number) => `${kind}:${i}`

/**
 * Upload a resume, let the AI pull out details, then review and approve
 * each item before anything is saved. The file itself isn't kept.
 */
export default function ResumeImport({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'read' | 'save' | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const read = async () => {
    if (!file) return
    setBusy('read')
    setError('')
    setDone('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('consent', consent ? 'yes' : 'no')
      const res = await fetch('/api/career/resume', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not read that resume')
      const d: Draft = data.draft
      setDraft(d)
      const all = new Set<string>()
      ;(['education', 'experience', 'certifications', 'skills'] as Kind[]).forEach((k) =>
        d[k].forEach((_: unknown, i: number) => all.add(key(k, i)))
      )
      setPicked(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that resume')
    } finally {
      setBusy(null)
    }
  }

  const toggle = (k: string) =>
    setPicked((cur) => {
      const next = new Set(cur)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const save = async () => {
    if (!draft) return
    setBusy('save')
    setError('')
    try {
      const chosen = <T,>(kind: Kind, list: T[]) => list.filter((_, i) => picked.has(key(kind, i)))
      const res = await fetch('/api/career/resume/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          education: chosen('education', draft.education),
          experience: chosen('experience', draft.experience),
          certifications: chosen('certifications', draft.certifications),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save')
      const skills = chosen('skills', draft.skills)
      if (skills.length) {
        await fetch('/api/auth/onboarding', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills, complete: false }),
        })
      }
      const n = data.saved.education + data.saved.experience + data.saved.certifications
      setDone(
        `Added ${n} ${n === 1 ? 'entry' : 'entries'}${skills.length ? ` and ${skills.length} skills (self-reported)` : ''}.` +
          (data.skipped
            ? ` ${data.skipped} item(s) were incomplete and skipped; you can add them by hand.`
            : '')
      )
      setDraft(null)
      setFile(null)
      if (input.current) input.current.value = ''
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  const Item = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <li className="flex gap-3 border-b border-line py-3 last:border-b-0">
      <input
        type="checkbox"
        className="mt-1"
        checked={picked.has(k)}
        onChange={() => toggle(k)}
        aria-label="Include this item"
      />
      <div className="min-w-0 text-sm">{children}</div>
    </li>
  )

  return (
    <div className="space-y-4 border border-line p-5">
      <div>
        <p className="font-medium">Fill this in from your resume</p>
        <p className="text-sm text-ink-muted">
          Optional. PDF, Word (.docx) or text, up to 5 MB. You review everything before it&apos;s
          added, and we don&apos;t keep the file.
        </p>
      </div>

      {!draft && (
        <>
          <input
            ref={input}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block text-sm"
          />
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree that the text of my resume is sent to Nexus&apos;s AI provider to pull out my
              details. The file isn&apos;t stored, and nothing is saved until I approve it.
            </span>
          </label>
          <Button onClick={read} isLoading={busy === 'read'} disabled={!file || !consent}>
            Read my resume
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
      {done && <p className="text-sm text-ink">{done}</p>}

      {draft && (
        <div className="space-y-5">
          <p className="text-sm text-ink-muted">
            Here&apos;s what we found. Untick anything that&apos;s wrong, then save. You can edit
            entries afterwards. Everything is marked Self-reported.
          </p>
          {draft.education.length > 0 && (
            <div>
              <p className="text-sm font-medium">Education</p>
              <ul>
                {draft.education.map((e, i) => (
                  <Item key={i} k={key('education', i)}>
                    {labelOf(EDUCATION_LEVELS, e.level)}
                    {e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}
                    <span className="text-ink-muted">
                      {' '}
                      ·{' '}
                      {[e.institution, labelOf(EDUCATION_STATUSES, e.status), e.graduationDate]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </Item>
                ))}
              </ul>
            </div>
          )}
          {draft.experience.length > 0 && (
            <div>
              <p className="text-sm font-medium">Experience</p>
              <ul>
                {draft.experience.map((x, i) => (
                  <Item key={i} k={key('experience', i)}>
                    {x.title} · {x.employer}
                    <span className="text-ink-muted">
                      {' '}
                      ·{' '}
                      {[
                        labelOf(EMPLOYMENT_TYPES, x.employmentType),
                        x.startDate && `${x.startDate} – ${x.current ? 'now' : (x.endDate ?? '?')}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </Item>
                ))}
              </ul>
            </div>
          )}
          {draft.certifications.length > 0 && (
            <div>
              <p className="text-sm font-medium">Certifications and licenses</p>
              <ul>
                {draft.certifications.map((c, i) => (
                  <Item key={i} k={key('certifications', i)}>
                    {c.name}
                    {c.issuer && <span className="text-ink-muted"> · {c.issuer}</span>}
                  </Item>
                ))}
              </ul>
            </div>
          )}
          {draft.skills.length > 0 && (
            <div>
              <p className="text-sm font-medium">Skills (added as Self-reported)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.skills.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    className="pill"
                    aria-pressed={picked.has(key('skills', i))}
                    onClick={() => toggle(key('skills', i))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {draft.education.length +
            draft.experience.length +
            draft.certifications.length +
            draft.skills.length ===
            0 && (
            <p className="text-sm text-ink-muted">
              We couldn&apos;t find any details in that file.
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={save} isLoading={busy === 'save'} disabled={picked.size === 0}>
              Add selected
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy === 'save'}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
