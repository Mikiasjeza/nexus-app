import type { Metadata } from 'next'
import * as Sentry from '@sentry/nextjs'
import { Inter } from 'next/font/google'
import { getMetadataBase, getAppUrl } from '@/lib/config/env'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import dynamic from 'next/dynamic'
import Header from '@/components/Layout/Header'
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
const CookieConsent = dynamic(() => import('@/components/UI/CookieConsent'), {
  ssr: false,
})

// Optimize font loading with display swap for faster rendering
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

const baseMetadata: Metadata = {
  title: {
    default: 'Nexus | Universal Capability Verification',
    template: '%s | Nexus',
  },
  description: 'Revolutionary AI-powered platform for universal skill verification and talent intelligence.',
  keywords: ['AI', 'Skill Verification', 'Talent Analytics', 'HR Tech', 'EdTech', 'Skill Assessment', 'Professional Development'],
  authors: [{ name: 'Nexus Team' }],
  creator: 'Nexus',
  publisher: 'Nexus',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: getMetadataBase(),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: getAppUrl(),
    siteName: 'Nexus',
    title: 'Nexus | Universal Capability Verification',
    description: 'Revolutionary AI-powered platform for universal skill verification and talent intelligence.',
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
    description: 'Revolutionary AI-powered platform for universal skill verification and talent intelligence.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark smooth-scroll">
      <body className={`${inter.className} bg-white dark:bg-black text-black dark:text-white min-h-screen flex flex-col transition-colors duration-500`}>
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="ambient-orb ambient-orb-cyan" />
          <div className="ambient-orb ambient-orb-violet" />
          <div className="ambient-grid" />
        </div>
        <ErrorBoundary>
          <ToastProvider>
            <Header />
            <main className="flex-1 w-full pt-16">
              <OnboardingGuard>
                <PageTransition>
                  {children}
                </PageTransition>
              </OnboardingGuard>
            </main>
            <Footer />
            <CookieConsent />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
