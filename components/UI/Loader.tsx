'use client'

/** Three quiet dots, pulsing in turn. */
export default function Loader() {
  return (
    <div className="flex items-center justify-center p-8" role="status" aria-label="Loading">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-ink-muted motion-reduce:animate-none"
            style={{ animationDelay: `${i * 160}ms`, animationDuration: '960ms' }}
          />
        ))}
      </div>
    </div>
  )
}
