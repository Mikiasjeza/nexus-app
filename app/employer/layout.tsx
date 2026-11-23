'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Loader from '@/components/UI/Loader'

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Signing up and accepting an invite happen before someone has a company.
    if (pathname?.startsWith('/employer/signup') || pathname?.startsWith('/employer/invite')) {
      setChecking(false)
      return
    }

    fetch('/api/employer/company', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          return
        } else {
          router.replace('/employer/signup')
        }
      })
      .catch(() => router.replace('/employer/signup'))
      .finally(() => setChecking(false))
  }, [pathname, router])

  if (
    checking &&
    !pathname?.startsWith('/employer/signup') &&
    !pathname?.startsWith('/employer/invite')
  ) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return <>{children}</>
}
