import type { ReactNode } from 'react'
import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { LEGAL } from '@/lib/legal'

const LEGAL_NAV = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
]

type LegalPageProps = {
  title: string
  summary: ReactNode
  current: string
  children: ReactNode
}

/** Long-form legal text: a readable measure, ruled sections, no panels. */
export default function LegalPage({ title, summary, current, children }: LegalPageProps) {
  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader title={title} rule description={`Effective ${LEGAL.effectiveDate}`} />

        <nav aria-label="Legal documents" className="-mt-4 mb-12 flex flex-wrap gap-2">
          {LEGAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === current ? 'page' : undefined}
              className="pill"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <aside className="text-[0.9375rem] leading-relaxed text-ink lg:sticky lg:top-28 lg:self-start">
            {summary}
          </aside>
          <article className="max-w-[44rem] space-y-12 text-[0.9375rem] leading-relaxed text-ink-muted">
            {children}
          </article>
        </div>
      </div>
    </AppPageShell>
  )
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="mb-4 text-lg font-medium text-ink">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-ink-faint">{children}</ul>
}

export function Mail({ to }: { to: string }) {
  return (
    <a
      href={`mailto:${to}`}
      className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
    >
      {to}
    </a>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  )
}
