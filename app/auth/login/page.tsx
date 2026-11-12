import { Suspense } from 'react'
import AppPageShell from '@/components/Layout/AppPageShell'
import { providerSummaries } from '@/lib/auth/oauth/providers'
import LoginForm from './LoginForm'

// Which "Continue with …" buttons to show depends on the server's settings.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell className="flex min-h-screen items-center justify-center" orbs={false}>
          <div className="h-9 w-9 animate-pulse rounded-full bg-pill" aria-hidden />
        </AppPageShell>
      }
    >
      <LoginForm providers={providerSummaries()} />
    </Suspense>
  )
}
