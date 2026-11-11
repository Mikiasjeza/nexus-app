'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/billing', label: 'Billing' },
]

/** The four admin screens as pills; sits in each page header's actions. */
export default function AdminNav() {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-1.5">
      {LINKS.map(({ href, label }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={href} href={href} className="pill" aria-current={active ? 'page' : undefined}>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
