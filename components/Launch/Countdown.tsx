'use client'

import { useEffect, useState } from 'react'

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [
    { label: 'days', value: Math.floor(s / 86400) },
    { label: 'hours', value: Math.floor((s % 86400) / 3600) },
    { label: 'minutes', value: Math.floor((s % 3600) / 60) },
    { label: 'seconds', value: s % 60 },
  ]
}

/** Live countdown to the approved launch date. Renders nothing until mounted. */
export default function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (now === null || Number.isNaN(target)) return null
  if (target <= now) return <p className="text-lg font-medium">Nexus is launching now.</p>
  return (
    <dl className="grid grid-cols-4 gap-2 sm:gap-4" aria-live="off">
      {parts(target - now).map((p) => (
        <div key={p.label} className="border border-line p-3 text-center sm:p-4">
          <dd className="display-number text-[clamp(1.75rem,5vw,3rem)] leading-none tabular-nums">
            {String(p.value).padStart(2, '0')}
          </dd>
          <dt className="label mt-2 text-ink-faint">{p.label}</dt>
        </div>
      ))}
    </dl>
  )
}
