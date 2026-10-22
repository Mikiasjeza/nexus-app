'use client'

import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import Button from '@/components/UI/Button'
import AppPageShell from '@/components/Layout/AppPageShell'

export default function NotFound() {
  return (
    <AppPageShell className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto w-full max-w-2xl text-center">
        <div className="gradient-border-card px-8 py-12 md:px-12 md:py-16">
          <div className="mb-6 text-7xl font-bold text-ink md:mb-8 md:text-9xl">404</div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight text-ink md:text-4xl lg:text-5xl">
            Page not found
          </h1>

          <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-ink-muted">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/" className="button-base button-primary">
              <Home className="h-4 w-4" />
              Go home
            </Link>
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => window.history.back()}
            >
              Go back
            </Button>
          </div>
        </div>
      </div>
    </AppPageShell>
  )
}
