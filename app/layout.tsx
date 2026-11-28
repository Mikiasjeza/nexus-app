import type { Metadata } from 'next'
import { Google_Sans } from 'next/font/google'
import * as Sentry from '@sentry/nextjs'
import { getMetadataBase, getAppUrl } from '@/lib/config/env'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import dynamic from 'next/dynamic'
import VerifyEmailBanner from '@/components/Auth/VerifyEmailBanner'
import Header from '@/components/Layout/Header'
import CookieConsent from '@/components/UI/CookieConsent'
import ConsentedAnalytics from '@/components/Analytics/ConsentedAnalytics'
import { ToastProvider } from '@/components/UI/ToastProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { OnboardingGuard } from '@/components/Auth/OnboardingGuard'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isPrelaunchPublic, prelaunchEnabled } from '@/lib/prelaunch'
import { getSessionUserId } from '@/lib/auth/session'

// Lazy load non-critical components
const Footer = dynamic(() => import('@/components/Layout/Footer'), {
  ssr: true,
})
const PageTransition = dynamic(() => import('@/components/PageTransition'), {
  ssr: true,
})

// One typeface does everything; headings get their character from tight tracking.
const sans = Google_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
  // next/font has no fallback metrics for this face yet; skip the adjustment.
  adjustFontFallback: false,
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Pre-launch mode: pages outside the public list need an account with access
  // (admin, allowlist or paying customer). getSessionUserId already returns
  // null for everyone else, so they're sent to Coming Soon.
  let bare = false
  if (prelaunchEnabled()) {
    const path = (await headers()).get('x-nexus-path') ?? ''
    if (path && !isPrelaunchPublic(path) && !(await getSessionUserId())) redirect('/coming-soon')
    bare = path === '/' || path === '/coming-soon'
  }
  return (
    <html lang="en" className={sans.variable}>
      <body className="flex min-h-screen flex-col bg-ground font-sans text-ink">
        <ErrorBoundary>
          <ToastProvider>
            {!bare && <Header />}
            <main className={`w-full flex-1 ${bare ? '' : 'pt-12'}`}>
              <VerifyEmailBanner />
              <OnboardingGuard>
                <PageTransition>{children}</PageTransition>
              </OnboardingGuard>
            </main>
            {!bare && <Footer />}
            <CookieConsent />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--ink)',
                  color: 'var(--ground)',
                  borderRadius: '0',
                  fontSize: '14px',
                },
              }}
            />
          </ToastProvider>
        </ErrorBoundary>
        <ConsentedAnalytics />
      </body>
    </html>
  )
}
