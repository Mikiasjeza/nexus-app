'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import { useToast } from '@/components/UI/ToastProvider'
import { invalidateUserCache } from '@/lib/hooks/useUser'

type Company = {
  id: string
  name: string
  slug: string
  logo?: string
  website?: string
  description?: string
  role: string
}

type Form = { name: string; website: string; logo: string; description: string }

const DESCRIPTION_LIMIT = 2000

function toForm(company: Company): Form {
  return {
    name: company.name,
    website: company.website ?? '',
    logo: company.logo ?? '',
    description: company.description ?? '',
  }
}

/** The employer's public company profile: what candidates see on /company/[slug]. */
export default function CompanyProfilePage() {
  const { addToast } = useToast()
  const [company, setCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<Form>({ name: '', website: '', logo: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/employer/company', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.company) throw new Error(data.error || 'Could not load your company')
      setCompany(data.company)
      setForm(toForm(data.company))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your company')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const canEdit = company?.role === 'owner' || company?.role === 'admin'
  const dirty = company ? JSON.stringify(form) !== JSON.stringify(toForm(company)) : false

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Company name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/employer/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setCompany(data.company)
      setForm(toForm(data.company))
      invalidateUserCache()
      addToast({ type: 'success', title: 'Company profile saved' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save'
      setError(message)
      addToast({ type: 'error', title: 'Not saved', message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  if (!company) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Company"
            rule
            description={error || 'We could not load your company right now.'}
            actions={
              <button
                type="button"
                onClick={load}
                className="button-base button-primary min-h-11 px-5"
              >
                Try again
              </button>
            }
          />
        </div>
      </AppPageShell>
    )
  }

  const field = (key: keyof Form) => ({
    value: form[key],
    disabled: !canEdit || saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Company"
          rule
          description="This is what candidates see when you save them to a shortlist or post a role."
          actions={
            <Link
              href={`/company/${company.slug}`}
              target="_blank"
              className="button-base button-secondary min-h-11 px-5"
            >
              View public page
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />

        <form
          onSubmit={save}
          className="grid gap-12 border-t border-line py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16"
        >
          <div className="max-w-2xl space-y-6">
            {error && (
              <div className="metalab-alert-error" role="alert">
                <p>{error}</p>
              </div>
            )}
            {!canEdit && (
              <p className="border-y border-line py-4 text-sm text-ink-muted">
                Only the owner or an admin of {company.name} can change this profile.
              </p>
            )}

            <div>
              <label className="metalab-label" htmlFor="company-name">
                Company name
              </label>
              <input
                id="company-name"
                type="text"
                required
                maxLength={200}
                className="metalab-input"
                {...field('name')}
              />
            </div>

            <div>
              <label className="metalab-label" htmlFor="company-website">
                Website
              </label>
              <input
                id="company-website"
                type="url"
                inputMode="url"
                placeholder="https://acme.com"
                className="metalab-input"
                {...field('website')}
              />
            </div>

            <div>
              <label className="metalab-label" htmlFor="company-logo">
                Logo address
              </label>
              <input
                id="company-logo"
                type="url"
                inputMode="url"
                placeholder="https://acme.com/logo.png"
                className="metalab-input"
                {...field('logo')}
              />
              <p className="mt-2 text-xs metalab-muted">A link to a square image of your logo.</p>
            </div>

            <div>
              <label className="metalab-label" htmlFor="company-description">
                About the company
              </label>
              <textarea
                id="company-description"
                rows={6}
                maxLength={DESCRIPTION_LIMIT}
                placeholder="What you build, how you work, and who you hire."
                className="metalab-input min-h-40 resize-y py-3"
                {...field('description')}
              />
              <p className="mt-2 text-xs metalab-muted">
                {form.description.length.toLocaleString()} / {DESCRIPTION_LIMIT.toLocaleString()}
              </p>
            </div>

            {canEdit && (
              <Button type="submit" disabled={!dirty || saving} isLoading={saving} size="lg">
                Save changes
              </Button>
            )}
          </div>

          <aside aria-label="Preview" className="lg:border-l lg:border-line lg:pl-10">
            <p className="text-sm text-ink-faint">Preview</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden border border-rule bg-raised text-lg font-semibold">
                {form.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo} alt="" className="size-full object-cover" />
                ) : (
                  (form.name.trim()[0] ?? '?').toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-medium">
                  {form.name || 'Company'}
                </p>
                {form.website && (
                  <p className="truncate text-sm text-ink-muted">
                    {form.website.replace(/^https?:\/\//, '')}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
              {form.description || 'No description yet.'}
            </p>
          </aside>
        </form>
      </div>
    </AppPageShell>
  )
}
