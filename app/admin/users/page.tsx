'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'
import AdminNav from '@/components/Admin/AdminNav'
import AdminUnavailable from '@/components/Admin/AdminUnavailable'
import UsersTable from '@/components/Admin/UsersTable'
import { adminApi, count } from '@/components/Admin/format'
import type { AdminUserList } from '@/lib/admin/users'

const PLAN_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paying' },
  { value: 'free', label: 'Free' },
]

const METHOD_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'email', label: 'Email' },
  { value: 'google', label: 'Google' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'linkedin', label: 'LinkedIn' },
]

/** Everyone with an account, newest first. Search and filters live in the address, so Back works. */
function UsersList() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const query = params.get('query') ?? ''
  const plan = params.get('plan') ?? 'all'
  const method = params.get('method') ?? 'all'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [data, setData] = useState<AdminUserList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(query)
  const latestRequest = useRef(0)
  // The last search this page wrote to the address. Any other change (the
  // Users tab, a link) comes from outside, and the box should show it.
  const ownQuery = useRef(query)

  useEffect(() => {
    if (query === ownQuery.current) return
    ownQuery.current = query
    setSearch(query)
  }, [query])

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    // Any new search or filter starts again from the first page.
    if (!('page' in changes)) next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === 'all' || (key === 'page' && value === '1')) next.delete(key)
      else next.set(key, value)
    }
    const text = next.toString()
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false })
  }

  // Search as they type, once they pause.
  useEffect(() => {
    if (search.trim() === query) return
    const timer = setTimeout(() => {
      ownQuery.current = search.trim()
      update({ query: search.trim() })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` only reads the current address
  }, [search, query])

  useEffect(() => {
    const request = ++latestRequest.current
    setLoading(true)
    const filters = new URLSearchParams({ query, plan, method, page: String(page) })
    adminApi<AdminUserList>(`/api/admin/users?${filters}`)
      .then((result) => {
        // A slower, older answer must not replace a newer one.
        if (request !== latestRequest.current) return
        setData(result)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (request === latestRequest.current) setError(e.message)
      })
  }, [query, plan, method, page])

  if (error) return <AdminUnavailable message={error} />
  if (!data) return <Loader />

  const filtered = Boolean(query) || plan !== 'all' || method !== 'all'

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Users"
          rule
          description="Everyone with an account, newest first. Open a person to see their plan, assessments and credentials."
          actions={<AdminNav />}
        />

        <div className="mb-8 grid gap-5 border-t border-line pt-6 lg:grid-cols-[minmax(0,22rem)_auto_auto] lg:items-end lg:gap-8">
          <div>
            <label htmlFor="user-search" className="metalab-label">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                aria-hidden
              />
              <input
                id="user-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email"
                autoComplete="off"
                className="metalab-input pl-10"
              />
            </div>
          </div>
          <FilterGroup
            label="Plan"
            options={PLAN_FILTERS}
            value={plan}
            onChange={(value) => update({ plan: value })}
          />
          <FilterGroup
            label="Signs in with"
            options={METHOD_FILTERS}
            value={method}
            onChange={(value) => update({ method: value })}
          />
        </div>

        <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
          {count(data.total, 'person', 'people')}
          {filtered ? ' match' : ''}
          {filtered && (
            <>
              {' · '}
              <button
                type="button"
                className="metalab-link"
                onClick={() => {
                  setSearch('')
                  router.replace(pathname, { scroll: false })
                }}
              >
                Show everyone
              </button>
            </>
          )}
        </p>

        {data.users.length === 0 ? (
          <p className="border-y border-line py-10 text-sm text-ink-muted">
            {filtered ? 'Nobody matches that.' : 'Nobody has an account yet.'}
          </p>
        ) : (
          <UsersTable users={data.users} loading={loading} />
        )}

        {data.pages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center gap-3 text-sm">
            <button
              type="button"
              className="pill disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              Previous
            </button>
            <span className="text-ink-muted">
              Page {data.page} of {data.pages}
            </span>
            <button
              type="button"
              className="pill disabled:opacity-40"
              disabled={page >= data.pages}
              onClick={() => update({ page: String(page + 1) })}
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </AppPageShell>
  )
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="metalab-label">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="pill"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<Loader />}>
      <UsersList />
    </Suspense>
  )
}
