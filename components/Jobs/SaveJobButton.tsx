'use client'

import { useState } from 'react'

/** Bookmark a job into Saved jobs (Dashboard > Saved jobs & applications). */
export default function SaveJobButton({
  job,
}: {
  job: { ref: string; title: string; company: string; location: string | null; url: string | null }
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle')
  const save = async () => {
    setState('busy')
    try {
      const res = await fetch('/api/jobs/tracker', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobRef: job.ref,
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          status: 'saved',
        }),
      })
      setState(res.ok ? 'saved' : 'error')
    } catch {
      setState('error')
    }
  }
  return (
    <button
      type="button"
      className="text-sm underline disabled:no-underline disabled:opacity-60"
      onClick={save}
      disabled={state === 'busy' || state === 'saved'}
    >
      {state === 'saved' ? 'Saved' : state === 'error' ? 'Try again' : 'Save job'}
    </button>
  )
}
