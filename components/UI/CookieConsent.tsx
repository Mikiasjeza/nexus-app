'use client'

import { useEffect, useState } from 'react'
import { Cookie } from 'lucide-react'
import Link from 'next/link'
import Button from './Button'
import ToggleSwitch from './ToggleSwitch'
import {
  DEFAULT_CHOICES,
  OPEN_PREFERENCES_EVENT,
  readConsent,
  saveConsent,
  type ConsentChoices,
} from '@/lib/consent'

/**
 * Cookie banner. Design rules (do not regress):
 * - "Reject" and "Accept" have identical styling and equal prominence.
 * - Non-essential categories are off until the visitor turns them on.
 * - No pre-ticked boxes, no auto-accept on scroll/close, no nagging after a choice.
 * - The choice can be changed at any time from the footer or /cookies.
 */
export default function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [choices, setChoices] = useState<ConsentChoices>(DEFAULT_CHOICES)

  useEffect(() => {
    const stored = readConsent()
    if (stored) setChoices(stored.choices)
    else setOpen(true)

    const reopen = () => {
      setChoices(readConsent()?.choices ?? DEFAULT_CHOICES)
      setCustomizing(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, reopen)
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, reopen)
  }, [])

  const decide = (next: ConsentChoices) => {
    saveConsent(next)
    setChoices(next)
    setOpen(false)
    setCustomizing(false)
  }

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
          className="cookie-consent-banner fixed bottom-0 left-0 right-0 z-[60] border-t border-line bg-[rgba(21,20,18,0.96)] backdrop-blur-md"
        >
          <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
              <div className="flex flex-1 items-start gap-4">
                <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pill sm:flex">
                  <Cookie className="h-5 w-5 text-verified" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="cookie-consent-title" className="mb-1 text-sm font-medium text-ink">
                    Your privacy choices
                  </h2>
                  <p
                    id="cookie-consent-desc"
                    className="text-[13px] leading-relaxed text-ink-muted"
                  >
                    We use essential cookies to keep you signed in and secure. We don&apos;t run
                    advertising or cross-site tracking. Optional diagnostics stay off unless you
                    turn them on.{' '}
                    <Link
                      href="/cookies"
                      className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                    >
                      Cookie policy
                    </Link>
                  </p>

                  {customizing ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-3">
                        <div>
                          <p className="text-sm font-medium text-ink">Essential</p>
                          <p className="text-xs text-ink-faint">
                            Sign-in, security and remembering this choice. Always on.
                          </p>
                        </div>
                        <ToggleSwitch checked disabled onChange={() => {}} />
                      </div>
                      <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-3">
                        <div>
                          <p className="text-sm font-medium text-ink">Diagnostics</p>
                          <p className="text-xs text-ink-faint">
                            If something breaks, send our error monitor (Sentry) a short replay of
                            the moments before it, with all text, inputs and images hidden. Helps us
                            fix bugs faster.
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={choices.analytics}
                          onChange={(analytics) => setChoices({ ...choices, analytics })}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto md:justify-end">
                {customizing ? (
                  <Button variant="outline" size="sm" onClick={() => decide(choices)}>
                    Save choices
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setCustomizing(true)}>
                    Customize
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => decide({ analytics: false })}>
                  Reject optional
                </Button>
                <Button variant="outline" size="sm" onClick={() => decide({ analytics: true })}>
                  Accept all
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
