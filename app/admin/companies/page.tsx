'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'
import AdminNav from '@/components/Admin/AdminNav'
import AdminUnavailable from '@/components/Admin/AdminUnavailable'

type Row = {
  id: string
  name: string
  slug: string
  website: string | null
  verified: boolean
  verifiedVia: 'domain' | 'admin' | null
  members: number
  jobs: number
  createdAt: string
}

const VIA: Record<string, string> = {
  domain: 'confirmed company email',
  admin: 'set by an admin',
}

/** Every company, with the Verified badge and a way to set it by hand. */
export default function AdminCompaniesPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/admin/companies?q=${encodeURIComponent(q)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not load')
      setRows(data.companies)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(query), 250)
    return () => clearTimeout(timer)
  }, [load, query])

  const act = async (id: string, action: 'verify' | 'unverify' | 'automatic') => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setRows(
        (list) =>
          list?.map((r) =>
            r.id === id ? { ...r, verified: data.verified, verifiedVia: data.verifiedVia } : r
          ) ?? null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  if (error && !rows) return <AdminUnavailable message={error} />

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Companies"
          rule
          description="A company gets the Verified badge when an owner or admin confirms an email on its website's domain. You can also set it by hand."
          actions={<AdminNav />}
        />

        <label className="sr-only" htmlFor="company-search">
          Search companies
        </label>
        <input
          id="company-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or website"
          className="metalab-input mb-8 max-w-md"
        />
        {error && (
          <p role="alert" className="mb-4 text-sm text-critical">
            {error}
          </p>
        )}

        {!rows ? (
          <Loader />
        ) : rows.length === 0 ? (
          <p className="border-y border-line py-6 text-ink-muted">No companies found.</p>
        ) : (
          <ul className="ruled-list border-y border-line">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div className="min-w-0">
                  <p className="text-lg font-medium">
                    <Link href={`/company/${c.slug}`} target="_blank" className="hover:underline">
                      {c.name}
                    </Link>
                  </p>
                  <p className="text-sm text-ink-muted">
                    {c.website ? c.website.replace(/^https?:\/\//, '') : 'No website'} · {c.members}{' '}
                    {c.members === 1 ? 'person' : 'people'} · {c.jobs}{' '}
                    {c.jobs === 1 ? 'job' : 'jobs'} · joined{' '}
                    {formatDistanceToNowStrict(new Date(c.createdAt), { addSuffix: true })}
                  </p>
                  <p
                    className={`mt-1 text-sm ${c.verified ? 'text-verified-ink' : 'text-ink-faint'}`}
                  >
                    {c.verified ? 'Verified' : 'Not verified'}
                    {c.verifiedVia ? ` (${VIA[c.verifiedVia]})` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!c.verified && (
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={() => act(c.id, 'verify')}
                      className="button-base button-primary min-h-10 px-4 text-sm"
                    >
                      Verify
                    </button>
                  )}
                  {c.verified && (
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={() => act(c.id, 'unverify')}
                      className="button-base button-secondary min-h-10 px-4 text-sm"
                    >
                      Remove badge
                    </button>
                  )}
                  {c.verifiedVia === 'admin' && (
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={() => act(c.id, 'automatic')}
                      className="button-base button-secondary min-h-10 px-4 text-sm"
                    >
                      Back to automatic
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPageShell>
  )
}
