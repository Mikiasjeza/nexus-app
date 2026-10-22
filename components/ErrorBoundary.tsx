'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ground p-6 text-ink">
          <div className="w-full max-w-md">
            <AlertCircle className="mb-6 size-6 text-critical" aria-hidden />
            <h1 className="page-title !text-[clamp(2rem,4vw,3rem)]">Something went wrong</h1>
            <p className="mt-4 text-ink-muted">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="button-base button-primary min-h-11 px-5"
              >
                <RefreshCw className="size-4" aria-hidden />
                Reload page
              </button>
              <Link href="/dashboard" className="button-base button-secondary min-h-11 px-5">
                <Home className="size-4" aria-hidden />
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
