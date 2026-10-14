import type { ReactNode } from 'react'
import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
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

export default function LegalPage({ title, summary, current, children }: LegalPageProps) {
  return (
    <AppPageShell>
      <div className="page-shell pb-28">
        <div className="hero-panel mb-10 p-8 md:p-10">
          <div className="hero-kicker mb-2">Legal</div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="text-sm metalab-muted md:text-base">Effective {LEGAL.effectiveDate}</p>
          <nav aria-label="Legal documents" className="mt-6 flex flex-wrap gap-2">
            {LEGAL_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === current ? 'page' : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                  item.href === current
                    ? 'border-cyan-300/40 bg-cyan-300/10 text-white'
                    : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mb-10 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5 text-[15px] leading-relaxed text-white/75 md:p-6">
          {summary}
        </div>

        <div className="gradient-border-card p-8 md:p-12">
          <article className="space-y-10 text-[15px] leading-relaxed text-white/70">
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
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-white/30">{children}</ul>
}

export function Mail({ to }: { to: string }) {
  return (
    <a
      href={`mailto:${to}`}
      className="text-cyan-200 underline decoration-white/20 underline-offset-2 hover:text-cyan-100"
    >
      {to}
    </a>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  )
}
