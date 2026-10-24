import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Check a credential',
  description:
    'Confirm who holds a Nexus credential, what it covers and whether it is still valid.',
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
