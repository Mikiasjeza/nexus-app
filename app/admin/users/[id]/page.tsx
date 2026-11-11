'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Loader from '@/components/UI/Loader'
import AdminUnavailable from '@/components/Admin/AdminUnavailable'
import UserDetailView from '@/components/Admin/UserDetailView'
import { adminApi } from '@/components/Admin/format'
import type { AdminUserDetail } from '@/lib/admin/users'

/** One person's record for admins. */
export default function AdminUserPage() {
  const id = String(useParams().id ?? '')
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setUser(null)
    setError(null)
    adminApi<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(id)}`)
      .then(setUser)
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <AdminUnavailable message={error} />
  if (!user) return <Loader />
  return <UserDetailView user={user} />
}
