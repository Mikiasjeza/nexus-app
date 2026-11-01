import type { ReactNode } from 'react'

type PageHeaderProps = {
  /** First line of the title; a trailing rule follows it when `rule` is set. */
  title: string
  /** Optional second line, indented like a continuation of the first. */
  titleContinued?: string
  rule?: boolean
  description?: ReactNode
  /** Primary and secondary actions, aligned with the title's baseline. */
  actions?: ReactNode
}

/**
 * Screen title in the display serif. No label above it: the title carries
 * its own weight, and the description sits in its own narrow column.
 */
export default function PageHeader({
  title,
  titleContinued,
  rule = false,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="grid gap-8 pb-10 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <h1 className="page-title">
          {title}
          {rule && <span className="title-rule" aria-hidden />}
          {titleContinued && (
            <>
              <br />
              <span className="pl-[0.6em]">{titleContinued}</span>
            </>
          )}
        </h1>
        {description && (
          <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:pb-3">{actions}</div>}
    </header>
  )
}
