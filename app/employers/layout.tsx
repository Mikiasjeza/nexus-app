import type { Metadata } from 'next'

const description =
  'Hire on proof, not claims. Search people by skills they have verified, see the evidence behind each one, keep shortlists and post roles.'

export const metadata: Metadata = {
  title: 'For Employers',
  description,
  openGraph: { title: 'Nexus for employers', description, url: '/employers' },
  twitter: { title: 'Nexus for employers', description },
}

export default function EmployersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
