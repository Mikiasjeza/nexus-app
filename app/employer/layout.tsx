'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Loader from '@/components/UI/Loader'

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasCompany, setHasCompany] = useState(false)

  useEffect(() => {
    if (pathname?.startsWith('/employer/signup')) {
      setChecking(false)
      return
    }

    fetch('/api/employer/company', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setHasCompany(true)
        } else {
          router.replace('/employer/signup')
        }
      })
      .catch(() => router.replace('/employer/signup'))
      .finally(() => setChecking(false))
  }, [pathname, router])

  if (checking && !pathname?.startsWith('/employer/signup')) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return <>{children}</>
}
