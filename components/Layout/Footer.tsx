'use client'

import Link from 'next/link'
import NexusLogo from '@/components/UI/NexusLogo'
import CookiePreferencesButton from '@/components/UI/CookiePreferencesButton'

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[rgba(9,9,11,0.88)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12">
        <div className="mb-12">
          <div className="mb-4">
            <NexusLogo size="default" />
          </div>
          <p className="max-w-xl text-[13px] leading-relaxed text-white/45">
            Nexus turns claims into proof with living skill passports, AI verification, and shareable credibility organized across five skill pillars.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-5 md:grid-cols-4 md:gap-6">
          <div className="insight-card p-6">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/skills" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Skills
                </Link>
              </li>
              <li>
                <Link href="/verification" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Verification
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div className="insight-card p-6">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div className="insight-card p-6">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Cookies
                </Link>
              </li>
              <li>
                <CookiePreferencesButton className="text-[13px] text-white/58 transition-colors hover:text-white" />
              </li>
            </ul>
          </div>

          <div className="insight-card p-6">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-[13px] text-white/58 transition-colors hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8">
          <p className="text-[12px] uppercase tracking-[0.14em] text-white/42">
            © {new Date().getFullYear()} Nexus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
