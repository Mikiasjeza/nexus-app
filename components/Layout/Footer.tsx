'use client'

import Link from 'next/link'
import CookiePreferencesButton from '@/components/UI/CookiePreferencesButton'

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/skills', label: 'Skills' },
      { href: '/verification', label: 'Verification' },
      { href: '/analytics', label: 'Analytics' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/marketplace', label: 'Marketplace' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/cookies', label: 'Cookies' },
    ],
  },
]

const linkClass = 'text-[0.9375rem] text-ink-muted transition-colors duration-150 hover:text-ink'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[90rem] gap-16 px-[clamp(1rem,4vw,3rem)] pb-10 pt-16 lg:grid-cols-[minmax(0,1fr)_auto]">
        <p className="page-title max-w-[14ch] !text-[clamp(2rem,3.5vw,3.25rem)]">
          Skill claims, turned into proof.
        </p>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-4 text-sm font-normal text-ink-faint">{column.title}</h2>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                {column.title === 'Legal' && (
                  <li>
                    <CookiePreferencesButton className={linkClass} />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>

        <p className="text-sm text-ink-faint lg:col-span-2">© {new Date().getFullYear()} Nexus</p>
      </div>
    </footer>
  )
}
