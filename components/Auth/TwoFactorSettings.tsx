'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Download } from 'lucide-react'
import Button from '@/components/UI/Button'
import { invalidateUserCache, useUser } from '@/lib/hooks/useUser'

type Step =
  | { kind: 'idle' }
  | { kind: 'scan'; secret: string; qr: string }
  | { kind: 'codes'; codes: string[] }
  | { kind: 'disable' }

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong')
  return data as T
}

/** Settings panel: turn two-step login on (scan, confirm, save codes) or off. */
export default function TwoFactorSettings({ disabled = false }: { disabled?: boolean }) {
  const { user } = useUser()
  const [enabled, setEnabled] = useState(false)
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setEnabled(Boolean(user?.twoFactorEnabled)), [user?.twoFactorEnabled])

  const reset = () => {
    setStep({ kind: 'idle' })
    setCode('')
    setError('')
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    run(async () => {
      const { secret, otpauthUrl } = await post<{ secret: string; otpauthUrl: string }>(
        '/api/auth/2fa/setup'
      )
      const qr = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 200 })
      setStep({ kind: 'scan', secret, qr })
    })

  const confirm = () =>
    run(async () => {
      const { recoveryCodes } = await post<{ recoveryCodes: string[] }>('/api/auth/2fa/enable', {
        code,
      })
      setEnabled(true)
      setCode('')
      invalidateUserCache()
      setStep({ kind: 'codes', codes: recoveryCodes })
    })

  const turnOff = () =>
    run(async () => {
      await post('/api/auth/2fa/disable', { code })
      setEnabled(false)
      invalidateUserCache()
      reset()
    })

  const downloadCodes = (codes: string[]) => {
    const text = `Nexus recovery codes for ${user?.email ?? 'your account'}\nEach code works once.\n\n${codes.join('\n')}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'nexus-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const employer = user?.accountType === 'employer'

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="font-medium">Two-step login</h3>
      <p className="mt-1 text-sm text-ink-muted">
        {enabled
          ? 'On. Signing in needs your password and a code from your authenticator app.'
          : employer
            ? 'Recommended for employer accounts: signing in also needs a code from an app on your phone.'
            : 'Signing in also needs a code from an app on your phone, such as Google Authenticator or 1Password.'}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-critical">
          {error}
        </p>
      )}

      {step.kind === 'idle' && (
        <div className="mt-4">
          {enabled ? (
            <Button
              variant="secondary"
              disabled={disabled}
              onClick={() => setStep({ kind: 'disable' })}
            >
              Turn off
            </Button>
          ) : (
            <Button variant="secondary" disabled={disabled} isLoading={busy} onClick={start}>
              Set up two-step login
            </Button>
          )}
        </div>
      )}

      {step.kind === 'scan' && (
        <div className="mt-4 space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-muted">
            <li>Open your authenticator app and add an account.</li>
            <li>Scan this code, or type the key below.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={step.qr}
            alt="QR code for your authenticator app"
            className="size-[200px] bg-white"
          />
          <p className="break-all font-mono text-sm text-ink">
            {step.secret.match(/.{1,4}/g)?.join(' ')}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="metalab-label" htmlFor="two-factor-setup-code">
                Code from the app
              </label>
              <input
                id="two-factor-setup-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="metalab-input w-40 tracking-[0.2em]"
                placeholder="123456"
              />
            </div>
            <Button onClick={confirm} isLoading={busy} disabled={busy || code.trim().length < 6}>
              Turn on
            </Button>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step.kind === 'codes' && (
        <div className="mt-4 space-y-4">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Check className="size-4 text-verified" aria-hidden />
            Two-step login is on.
          </p>
          <p className="text-sm text-ink-muted">
            Save these recovery codes somewhere safe. If you lose your phone, each one lets you sign
            in once. We won&apos;t show them again.
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 border border-rule p-4 font-mono text-sm sm:max-w-sm">
            {step.codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              leftIcon={<Download className="size-4" aria-hidden />}
              onClick={() => downloadCodes(step.codes)}
            >
              Download codes
            </Button>
            <Button onClick={reset}>I&apos;ve saved them</Button>
          </div>
        </div>
      )}

      {step.kind === 'disable' && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="metalab-label" htmlFor="two-factor-disable-code">
              Code from your app, or a recovery code
            </label>
            <input
              id="two-factor-disable-code"
              autoComplete="one-time-code"
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="metalab-input w-56"
            />
          </div>
          <Button
            variant="danger"
            onClick={turnOff}
            isLoading={busy}
            disabled={busy || !code.trim()}
          >
            Turn off two-step login
          </Button>
          <Button variant="ghost" onClick={reset} disabled={busy}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
