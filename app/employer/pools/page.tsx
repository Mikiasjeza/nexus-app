'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import Link from 'next/link'
import Loader from '@/components/UI/Loader'
import Modal from '@/components/UI/Modal'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

interface Pool {
  id: string
  name: string
  candidateCount: number
  createdAt: string
}

export default function EmployerPoolsPage() {
  const { addToast } = useToast()
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPools = () => {
    fetch('/api/employer/pools', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.pools) setPools(data.pools)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPools()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/employer/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPools((prev) => [data, ...prev])
      setNewName('')
      addToast({ type: 'success', title: 'Shortlist created', message: data.name })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not create',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(null)
    try {
      const res = await fetch(`/api/employer/pools/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      setPools((prev) => prev.filter((p) => p.id !== id))
      addToast({ type: 'success', title: 'Shortlist deleted' })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not delete',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  const deleting = pools.find((pool) => pool.id === deletingId)

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Shortlists"
          rule
          description="Keep the people worth a second look, grouped however your team hires."
        />

        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row"
        >
          <label className="flex-1">
            <span className="sr-only">New shortlist name</span>
            <input
              type="text"
              placeholder="New shortlist, e.g. Frontend, spring hires"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="metalab-input"
            />
          </label>
          <Button
            type="submit"
            disabled={creating || !newName.trim()}
            isLoading={creating}
            leftIcon={<Plus className="size-4" aria-hidden />}
          >
            Create
          </Button>
        </form>

        {loading ? (
          <Loader />
        ) : pools.length === 0 ? (
          <div className="mt-6 border-y border-line py-12">
            <p className="font-display text-3xl font-light">No shortlists yet</p>
            <p className="mt-3 max-w-md text-ink-muted">
              Create one above, then add people to it from a talent search.
            </p>
            <Link
              href="/employer/talent"
              className="button-base button-secondary mt-6 min-h-11 px-5"
            >
              Find talent
            </Link>
          </div>
        ) : (
          <ul className="ruled-list mt-6 border-y border-line">
            {pools.map((pool) => (
              <li key={pool.id} className="flex items-center justify-between gap-6 py-6">
                <Link href={`/employer/pools/${pool.id}`} className="group min-w-0 flex-1">
                  <span className="font-display text-[clamp(1.75rem,2.6vw,2.25rem)] font-light leading-tight group-hover:text-ink">
                    {pool.name}
                  </span>
                  <span className="mt-1 block text-sm text-ink-faint">
                    {pool.candidateCount} {pool.candidateCount === 1 ? 'person' : 'people'} ·
                    created{' '}
                    {formatDistanceToNowStrict(new Date(pool.createdAt), { addSuffix: true })}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDeletingId(pool.id)}
                  className="pill size-9 justify-center p-0 hover:!bg-critical/15 hover:text-critical"
                  aria-label={`Delete ${pool.name}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Modal
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          title="Delete shortlist"
          size="sm"
        >
          <p className="leading-relaxed text-ink-muted">
            Delete <span className="text-ink">{deleting?.name ?? 'this shortlist'}</span>? The
            people in it stay on Nexus; only the list goes.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deletingId && handleDelete(deletingId)}>
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </AppPageShell>
  )
}
