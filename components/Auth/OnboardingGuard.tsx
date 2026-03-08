'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api'
import Loader from '@/components/UI/Loader'

/** Protected paths that require onboarding completion */
const PROTECTED_PATHS = ['/dashboard', '/skills', '/settings', '/analytics', '/marketplace', '/verification']
const ONBOARDING_PATH = '/onboarding'

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!pathname || pathname === ONBOARDING_PATH || !isProtectedPath(pathname)) {
      setChecking(false)
      return
    }

    authApi.getCurrentUser().then(user => {
      if (user && user.onboardingComplete === false) {
        router.replace('/onboarding')
        return
      }
      setChecking(false)
    }).catch(() => setChecking(false))
  }, [pathname, router])

  if (checking && pathname && isProtectedPath(pathname) && pathname !== ONBOARDING_PATH) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return <>{children}</>
}
