'use client'

import { useEffect, useState } from 'react'
import Loader from '@/components/UI/Loader'
import AdminUnavailable from '@/components/Admin/AdminUnavailable'
import OverviewView from '@/components/Admin/OverviewView'
import { adminApi } from '@/components/Admin/format'
import type { AdminOverview } from '@/lib/admin/overview'

/** Admin home: who joined, what they did, and what needs a person. */
export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminApi<AdminOverview>('/api/admin/overview')
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <AdminUnavailable message={error} />
  if (!data) return <Loader />
  return <OverviewView data={data} />
}
