import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn how Nexus uses multimodal AI to verify skills through real evidence—code, videos, portfolios—across five pillars: build, create, explain, lead, and grow.',
  openGraph: {
    title: 'About Nexus',
    description: 'Building a clearer way to verify, organize, and share skills across the five pillars that shape modern work.',
    url: '/about',
  },
  twitter: {
    title: 'About Nexus',
    description: 'Building a clearer way to verify, organize, and share skills across the five pillars that shape modern work.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
