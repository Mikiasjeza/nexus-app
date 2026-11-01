import type { Metadata } from 'next'
import { Hanken_Grotesk, Noto_Serif_Display } from 'next/font/google'
import * as Sentry from '@sentry/nextjs'
import { getMetadataBase, getAppUrl } from '@/lib/config/env'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import dynamic from 'next/dynamic'
import Header from '@/components/Layout/Header'
import CookieConsent from '@/components/UI/CookieConsent'
import { ToastProvider } from '@/components/UI/ToastProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { OnboardingGuard } from '@/components/Auth/OnboardingGuard'

// Lazy load non-critical components
const Footer = dynamic(() => import('@/components/Layout/Footer'), {
  ssr: true,
})
const PageTransition = dynamic(() => import('@/components/PageTransition'), {
  ssr: true,
})

// UI text. Variable, so in-between weights such as 350 are available.
const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Thin high-contrast display serif for page titles and headline numbers.
const display = Noto_Serif_Display({
  subsets: ['latin'],
  weight: ['200', '300'],
  variable: '--font-display',
  display: 'swap',
})

function getSafeMetadataBase(): URL {
  try {
    return getMetadataBase()
  } catch {
    return new URL(
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nexus.ai'
    )
  }
}

const baseMetadata: Metadata = {
  title: {
    default: 'Nexus | Universal Capability Verification',
    template: '%s | Nexus',
  },
  description:
    'Revolutionary AI-powered platform for universal skill verification and talent intelligence.',
  keywords: [
    'AI',
    'Skill Verification',
    'Talent Analytics',
    'HR Tech',
    'EdTech',
    'Skill Assessment',
    'Professional Development',
  ],
  authors: [{ name: 'Nexus Team' }],
  creator: 'Nexus',
  publisher: 'Nexus',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: getSafeMetadataBase(),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: getAppUrl(),
    siteName: 'Nexus',
    title: 'Nexus | Universal Capability Verification',
    description:
      'Revolutionary AI-powered platform for universal skill verification and talent intelligence.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nexus',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus | Universal Capability Verification',
    description:
      'Revolutionary AI-powered platform for universal skill verification and talent intelligence.',
    images: ['/og-image.png'],
    creator: '@nexus',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
}

export function generateMetadata(): Metadata {
  return {
    ...baseMetadata,
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col bg-ground font-sans text-ink">
        <ErrorBoundary>
          <ToastProvider>
            <Header />
            <main className="w-full flex-1 pt-20">
              <OnboardingGuard>
                <PageTransition>{children}</PageTransition>
              </OnboardingGuard>
            </main>
            <Footer />
            <CookieConsent />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1d1b18',
                  color: '#e9e4da',
                  borderRadius: '9999px',
                  fontSize: '14px',
                },
              }}
            />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
