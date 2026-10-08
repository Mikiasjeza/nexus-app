import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Start free, upgrade when you need more. Nexus Starter is free forever. Pro unlocks unlimited skills and AI analysis. Enterprise covers your whole team.',
  openGraph: {
    title: 'Nexus Pricing',
    description: 'Free to start. Upgrade when you need more — Pro at $9.99/mo unlocks unlimited AI-verified skills.',
    url: '/pricing',
  },
  twitter: {
    title: 'Nexus Pricing',
    description: 'Free to start. Upgrade when you need more — Pro at $9.99/mo unlocks unlimited AI-verified skills.',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
