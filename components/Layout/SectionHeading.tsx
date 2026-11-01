import type { ReactNode } from 'react'

/** A section's name on the left and a quiet note (range, unit, scope) on the right. */
export default function SectionHeading({
  id,
  note,
  children,
}: {
  id?: string
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-base font-medium">
        {children}
      </h2>
      {note && <span className="text-sm text-ink-faint">{note}</span>}
    </div>
  )
}
