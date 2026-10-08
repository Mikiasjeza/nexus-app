import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'See how Nexus turns skills into verified proof in four steps: add skills, upload evidence, get AI analysis, and share your passport.',
  openGraph: {
    title: 'How Nexus Works',
    description: 'From first skill to shared passport in under 10 minutes — four steps, powered by multimodal AI.',
    url: '/how-it-works',
  },
  twitter: {
    title: 'How Nexus Works',
    description: 'From first skill to shared passport in under 10 minutes — four steps, powered by multimodal AI.',
  },
}

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
