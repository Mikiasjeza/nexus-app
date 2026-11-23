'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import Button from '@/components/UI/Button'
import { ROLE_LABELS, TEAM_ROLES, type CompanyRole, type TeamRole } from '@/lib/employer/roles'

type Member = { id: string; role: CompanyRole; name: string; email: string; isYou: boolean }
type Invite = { id: string; email: string; role: TeamRole; expiresAt: string }
type Team = { role: CompanyRole; members: Member[]; invites: Invite[] }

const ROLE_HELP: Record<TeamRole, string> = {
  admin: 'Everything, including the team',
  recruiter: 'Jobs, applicants and shortlists',
  viewer: 'Can look, cannot change anything',
}

/** Company teammates: who's on the account, their roles, and invites. */
export default function TeamPanel() {
  const [team, setTeam] = useState<Team | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('recruiter')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/employer/team', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setTeam(data)
    else setError(data.error || 'Could not load your team')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const call = async (url: string, init: RequestInit, done?: string) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(url, {
        ...init,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      if (done) setNotice(done)
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      return false
    } finally {
      setBusy(false)
    }
  }

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    const sent = await call(
      '/api/employer/team',
      { method: 'POST', body: JSON.stringify({ email, role }) },
      `Invite sent to ${email}.`
    )
    if (sent) setEmail('')
  }

  if (!team) {
    return error ? <p className="text-sm text-critical">{error}</p> : null
  }
  const manager = team.role === 'owner' || team.role === 'admin'

  return (
    <section aria-labelledby="team-heading" className="border-t border-line py-12">
      <h2 id="team-heading" className="text-base font-medium">
        Team
      </h2>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        People who hire with you. Everyone shares your jobs, shortlists and applicants.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-critical">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm text-ink">
          {notice}
        </p>
      )}

      <ul className="ruled-list mt-6 max-w-3xl border-y border-line">
        {team.members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {m.name}
                {m.isYou && <span className="text-ink-faint"> (you)</span>}
              </p>
              <p className="truncate text-sm text-ink-muted">{m.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {manager && m.role !== 'owner' && !m.isYou ? (
                <>
                  <label className="sr-only" htmlFor={`role-${m.id}`}>
                    Role for {m.name}
                  </label>
                  <select
                    id={`role-${m.id}`}
                    value={m.role}
                    disabled={busy}
                    onChange={(e) =>
                      call(`/api/employer/team/${m.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ role: e.target.value }),
                      })
                    }
                    className="metalab-input w-auto py-1.5 text-sm"
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Remove ${m.name} from the team?`)) {
                        call(
                          `/api/employer/team/${m.id}`,
                          { method: 'DELETE' },
                          `${m.name} removed.`
                        )
                      }
                    }}
                    className="text-sm text-ink-faint hover:text-critical"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className="text-sm text-ink-muted">{ROLE_LABELS[m.role]}</span>
              )}
            </div>
          </li>
        ))}
        {team.invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{i.email}</p>
              <p className="text-sm text-ink-faint">
                Invited as {ROLE_LABELS[i.role]} · expires{' '}
                {formatDistanceToNowStrict(new Date(i.expiresAt), { addSuffix: true })}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                call(`/api/employer/team/${i.id}`, { method: 'DELETE' }, 'Invite cancelled.')
              }
              className="text-sm text-ink-faint hover:text-critical"
            >
              Cancel invite
            </button>
          </li>
        ))}
      </ul>

      {manager && (
        <form onSubmit={invite} className="mt-6 flex max-w-3xl flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="metalab-label" htmlFor="invite-email">
              Invite by email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="metalab-input"
            />
          </div>
          <div>
            <label className="metalab-label" htmlFor="invite-role">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="metalab-input w-auto"
            >
              {TEAM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" isLoading={busy} disabled={busy}>
            Send invite
          </Button>
          <p className="w-full text-xs text-ink-faint">{ROLE_HELP[role]}.</p>
        </form>
      )}
    </section>
  )
}
