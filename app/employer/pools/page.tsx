'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2 } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import Link from 'next/link'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import AppPageShell from '@/components/Layout/AppPageShell'

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
      addToast({ type: 'success', title: 'Pool created', message: data.name })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this talent pool?')) return
    try {
      const res = await fetch(`/api/employer/pools/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed')
      setPools((prev) => prev.filter((p) => p.id !== id))
      addToast({ type: 'success', title: 'Pool deleted' })
    } catch {
      addToast({ type: 'error', title: 'Failed to delete' })
    }
  }

  return (
    <AppPageShell className="min-h-screen bg-black py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="hero-panel p-8 md:p-10">
            <h1 className="text-4xl font-bold text-white mb-2">
              Talent Pools
            </h1>
            <p className="text-lg text-white/60 mb-8 max-w-3xl">
              Organize candidates by the pillars your team hires for most often, then revisit the strongest profiles without losing context.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-8">
              {SKILL_PILLAR_DETAILS.map((pillar) => (
                <div
                  key={pillar.category}
                  className="insight-card p-4"
                  style={{ borderColor: `${CATEGORY_COLORS[pillar.category]}30` }}
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">{pillar.shortLabel}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{pillar.category}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreate} className="flex gap-4 mb-0">
              <input
                type="text"
                placeholder="New pool name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-3 border border-white/10 bg-black/40 text-white"
              />
              <Button type="submit" disabled={creating || !newName.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </form>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-white/40">Loading...</div>
        ) : pools.length === 0 ? (
          <div className="gradient-border-card p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <h3 className="text-xl font-medium text-white mb-2">
              No talent pools yet
            </h3>
            <p className="text-white/60 mb-4">
              Create a pool to save candidates from your talent search
            </p>
            <Link href="/employer/talent">
              <Button>Search Talent</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool, index) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="gradient-border-card p-6 flex items-center justify-between"
              >
                <Link href={`/employer/pools/${pool.id}`} className="flex-1">
                  <h3 className="text-xl font-semibold text-white">
                    {pool.name}
                  </h3>
                  <p className="text-white/60 text-sm mt-1">
                    {pool.candidateCount} candidate{pool.candidateCount !== 1 ? 's' : ''}
                  </p>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(pool.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppPageShell>
  )
}
