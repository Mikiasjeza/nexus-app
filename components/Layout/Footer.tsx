'use client'

import { usePathname } from 'next/navigation'
import HalftoneWordmarkFooter, { type FooterColumn } from '@/components/UI/HalftoneWordmarkFooter'
import { openCookiePreferences } from '@/lib/consent'

const company: FooterColumn = {
  title: 'Company',
  links: [
    { label: 'About', href: '/about' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
  ],
}

const legal: FooterColumn = {
  title: 'Legal',
  links: [
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Cookies', href: '/cookies' },
    { label: 'Cookie settings', onClick: openCookiePreferences },
  ],
}

const candidateColumns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Skills', href: '/skills' },
      { label: 'Verification', href: '/verification' },
      { label: 'Analytics', href: '/analytics' },
      { label: 'Marketplace', href: '/marketplace' },
    ],
  },
  {
    ...company,
    links: [...company.links, { label: 'For employers', href: '/employer/dashboard' }],
  },
  legal,
]

const employerColumns: FooterColumn[] = [
  {
    title: 'Hiring',
    links: [
      { label: 'Dashboard', href: '/employer/dashboard' },
      { label: 'Find talent', href: '/employer/talent' },
      { label: 'Jobs', href: '/employer/jobs' },
      { label: 'Talent pools', href: '/employer/pools' },
    ],
  },
  { ...company, links: [...company.links, { label: 'For candidates', href: '/dashboard' }] },
  legal,
]

/** Site footer: the "nexus" wordmark in halftone, with links for whichever side you're on. */
export default function Footer() {
  const pathname = usePathname() ?? ''
  const isEmployer = pathname.startsWith('/employer') || pathname.startsWith('/company')

  return (
    <HalftoneWordmarkFooter
      className="mt-24"
      label="Nexus"
      meta={
        isEmployer
          ? 'Hire on skills the AI has checked, not on claims.'
          : 'Skill claims, turned into proof.'
      }
      columns={isEmployer ? employerColumns : candidateColumns}
      legal={`© ${new Date().getFullYear()} Nexus`}
    />
  )
}
