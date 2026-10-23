'use client'

// Site footer: brand line, link columns and a back-to-top over the "nexus"
// wordmark printed in halftone dots (see HalftoneWord). With `printed` off it
// keeps the same links and type on a plain hairline footer.

import * as React from 'react'
import Link from 'next/link'
import HalftoneWord, { type HalftonePalette } from './HalftoneWord'

export interface FooterLink {
  label: string
  href?: string
  /** An action instead of a link, e.g. reopening cookie settings. */
  onClick?: () => void
}

export interface FooterColumn {
  title: string
  links: FooterLink[]
}

export interface HalftoneWordmarkFooterProps {
  /** The giant word printed in dots. Lowercase reads best. */
  wordmark?: string
  /** Print the wordmark in dots. Off gives a plain footer. Defaults to true. */
  printed?: boolean
  /** Top-left brand line. */
  label?: React.ReactNode
  /** The muted line under it. */
  meta?: React.ReactNode
  /** Link columns along the top. */
  columns?: FooterColumn[]
  /** Left end of the hairline row, e.g. the copyright. */
  legal?: React.ReactNode
  /** Show the back-to-top button. Defaults to true. */
  backToTop?: boolean
  palette?: Partial<HalftonePalette>
  /** Root height when printed. A definite length, never a percentage. */
  height?: string
  className?: string
}

const linkClass =
  'text-[0.9375rem] text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:text-ink'

export default function HalftoneWordmarkFooter({
  wordmark = 'nexus',
  printed = true,
  label,
  meta,
  columns = [],
  legal,
  backToTop = true,
  palette,
  height = 'clamp(440px, 46vw, 620px)',
  className = '',
}: HalftoneWordmarkFooterProps) {
  const toTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  const content = (
    <>
      <div className="relative z-[1] mx-auto grid max-w-[90rem] grid-cols-2 gap-x-6 gap-y-10 px-[clamp(1rem,4vw,3rem)] pt-[clamp(2rem,4vw,3.5rem)] md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-2 md:col-span-1">
          {label && <p className="text-[0.9375rem] font-medium">{label}</p>}
          {meta && <p className="mt-1 max-w-[22rem] text-[0.9375rem] text-ink-faint">{meta}</p>}
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-4 text-sm font-normal text-ink-faint">{column.title}</h2>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.onClick ? (
                    <button type="button" onClick={link.onClick} className={linkClass}>
                      {link.label}
                    </button>
                  ) : link.href?.startsWith('/') ? (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="relative z-[1] mx-auto mt-[clamp(1.5rem,3vw,2.5rem)] max-w-[90rem] px-[clamp(1rem,4vw,3rem)]">
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3 text-sm text-ink-faint">
          <span>{legal}</span>
          {backToTop && (
            <button
              type="button"
              onClick={toTop}
              className="transition-colors duration-150 hover:text-ink"
            >
              Back to top ↑
            </button>
          )}
        </div>
      </div>
    </>
  )

  if (!printed) {
    return (
      <footer className={`w-full border-t border-line bg-ground pb-10 font-sans ${className}`}>
        {content}
      </footer>
    )
  }

  return (
    <HalftoneWord
      as="footer"
      word={wordmark}
      palette={palette}
      height={height}
      className={`border-t border-line ${className}`}
    >
      {content}
    </HalftoneWord>
  )
}
