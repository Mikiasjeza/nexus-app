import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CalendarPreview from './CalendarPreview'

export const metadata: Metadata = {
  title: 'Calendar placement (preview)',
  robots: { index: false, follow: false },
}

/** Temporary page for choosing where the month calendar goes. Never served in production. */
export default function CalendarPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <CalendarPreview />
}
