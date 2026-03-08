'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2 } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import Link from 'next/link'

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
    <div className="min-h-screen bg-white dark:bg-black py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Talent Pools
          </h1>
          <p className="text-lg text-black/60 dark:text-white/60 mb-8">
            Organize candidates you want to track
          </p>

          <form onSubmit={handleCreate} className="flex gap-4 mb-8">
            <input
              type="text"
              placeholder="New pool name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
            />
            <Button type="submit" disabled={creating || !newName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </form>
        </motion.div>

        {loading ? (
          <div className="text-black/40 dark:text-white/40">Loading...</div>
        ) : pools.length === 0 ? (
          <div className="border border-black/10 dark:border-white/10 p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
            <h3 className="text-xl font-medium text-black dark:text-white mb-2">
              No talent pools yet
            </h3>
            <p className="text-black/60 dark:text-white/60 mb-4">
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
                className="border border-black/10 dark:border-white/10 p-6 flex items-center justify-between"
              >
                <Link href={`/employer/pools/${pool.id}`} className="flex-1">
                  <h3 className="text-xl font-semibold text-black dark:text-white">
                    {pool.name}
                  </h3>
                  <p className="text-black/60 dark:text-white/60 text-sm mt-1">
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
    </div>
  )
}
