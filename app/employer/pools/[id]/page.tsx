'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { User, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'

interface Candidate {
  id: string
  name: string
  avatar?: string
  shareableId: string
  skills: { name: string; level: string; verified: boolean }[]
}

interface PoolDetail {
  id: string
  name: string
  candidates: Candidate[]
}

export default function EmployerPoolDetailPage() {
  const params = useParams()
  const poolId = params.id as string
  const [pool, setPool] = useState<PoolDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!poolId) return
    fetch(`/api/employer/pools/${poolId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setPool(data)
      })
      .finally(() => setLoading(false))
  }, [poolId])

  const handleRemove = async (candidateId: string) => {
    if (!poolId) return
    try {
      await fetch(`/api/employer/pools/${poolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ removeCandidateId: candidateId }),
      })
      setPool((prev) =>
        prev
          ? {
              ...prev,
              candidates: prev.candidates.filter((c) => c.id !== candidateId),
            }
          : null
      )
    } catch {
      // ignore
    }
  }

  if (loading || !pool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-black/40 dark:text-white/40">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Link
          href="/employer/pools"
          className="inline-flex items-center gap-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pools
        </Link>

        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
          {pool.name}
        </h1>
        <p className="text-black/60 dark:text-white/60 mb-12">
          {pool.candidates.length} candidate{pool.candidates.length !== 1 ? 's' : ''}
        </p>

        {pool.candidates.length === 0 ? (
          <div className="border border-black/10 dark:border-white/10 p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
            <p className="text-black/60 dark:text-white/60 mb-4">
              No candidates in this pool yet
            </p>
            <Link href="/employer/talent">
              <Button>Search Talent</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {pool.candidates.map((c) => (
              <div
                key={c.id}
                className="border border-black/10 dark:border-white/10 p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    {c.avatar ? (
                      <img
                        src={c.avatar}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-black/40 dark:text-white/40" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-black dark:text-white">
                      {c.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {c.skills.slice(0, 5).map((s) => (
                        <Badge
                          key={s.name}
                          variant={s.verified ? 'primary' : 'default'}
                          size="sm"
                        >
                          {s.verified && <Shield className="w-3 h-3" />}
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/share/${c.shareableId}`} target="_blank">
                    <Button variant="primary" size="sm">
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(c.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
