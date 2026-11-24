'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api'
import Loader from '@/components/UI/Loader'

/** Protected paths that require onboarding completion */
const PROTECTED_PATHS = [
  '/dashboard',
  '/skills',
  '/settings',
  '/analytics',
  '/career',
  '/marketplace',
  '/verification',
]
const ONBOARDING_PATH = '/onboarding'

/** The candidate side: employers are sent to their own dashboard instead. */
const CANDIDATE_ONLY_PATHS = [
  '/dashboard',
  '/skills',
  '/analytics',
  '/career',
  '/marketplace',
  '/verification',
  ONBOARDING_PATH,
]
const EMPLOYER_HOME = '/employer/dashboard'

function matches(paths: string[], pathname: string): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isGuarded(pathname: string): boolean {
  return matches(PROTECTED_PATHS, pathname) || matches(CANDIDATE_ONLY_PATHS, pathname)
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!pathname || !isGuarded(pathname)) {
      setChecking(false)
      return
    }

    authApi
      .getCurrentUser()
      .then((user) => {
        if (user?.accountType === 'employer') {
          // Employers have no candidate onboarding and no candidate pages.
          if (matches(CANDIDATE_ONLY_PATHS, pathname)) {
            router.replace(EMPLOYER_HOME)
            return
          }
        } else if (
          user &&
          user.onboardingComplete === false &&
          pathname !== ONBOARDING_PATH &&
          matches(PROTECTED_PATHS, pathname)
        ) {
          router.replace(ONBOARDING_PATH)
          return
        }
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [pathname, router])

  if (checking && pathname && isGuarded(pathname)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return <>{children}</>
}
