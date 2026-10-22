import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DashboardPreview from './DashboardPreview'

export const metadata: Metadata = {
  title: 'Dashboard layouts (preview)',
  robots: { index: false, follow: false },
}

/** Temporary page for choosing a dashboard layout. Never served in production. */
export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <DashboardPreview />
}
