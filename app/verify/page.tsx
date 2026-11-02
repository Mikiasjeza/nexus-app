'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'

const PATTERN = /^NX-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/

export default function VerifyIndexPage() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const id = value.trim().toUpperCase()
    if (!PATTERN.test(id)) {
      setError('A credential id looks like NX-7K2M-9QXD-4FTA.')
      return
    }
    router.push(`/verify/${id}`)
  }

  return (
    <AppPageShell>
      <div className="page-shell max-w-3xl">
        <PageHeader
          title="Check a credential"
          rule
          description="Enter the id from a Nexus credential to see who holds it, what it covers and whether it is still valid."
        />
        <form onSubmit={submit} className="flex max-w-xl flex-col gap-3 sm:flex-row" noValidate>
          <label htmlFor="credential-id" className="sr-only">
            Credential id
          </label>
          <input
            id="credential-id"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            placeholder="NX-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="metalab-input font-mono uppercase"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'credential-error' : undefined}
          />
          <Button type="submit">Check</Button>
        </form>
        {error && (
          <p id="credential-error" role="alert" className="mt-3 text-sm text-caution">
            {error}
          </p>
        )}
        <p className="mt-12 text-sm text-ink-muted">
          Credentials come from{' '}
          <Link href="/assessments" className="metalab-link">
            Nexus assessments
          </Link>
          : timed, hands-on tasks graded against hidden tests and a published rubric.
        </p>
      </div>
    </AppPageShell>
  )
}
