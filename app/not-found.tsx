'use client'

import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import HalftoneWord from '@/components/UI/HalftoneWord'

/** 404: the same halftone print as the footer wordmark, set as "404". */
export default function NotFound() {
  return (
    <AppPageShell>
      <div className="page-shell !pb-0">
        <h1 className="page-title">
          Nothing here
          <span className="title-rule" aria-hidden />
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-muted">
          This page doesn’t exist or has moved. Move across the dots, or click them.
        </p>
        <div className="mt-10 flex flex-wrap gap-2">
          <Link href="/" className="button-base button-primary min-h-11 px-5">
            Go home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="button-base button-secondary min-h-11 px-5"
          >
            Go back
          </button>
        </div>
      </div>

      <HalftoneWord
        word="404"
        aria-label="Error 404"
        height="clamp(300px, 40vw, 600px)"
        fit={0.92}
        crop={0}
        className="mt-12"
      />
    </AppPageShell>
  )
}
