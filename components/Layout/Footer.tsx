'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="mb-10">
          <p className="text-sm text-white/65">
            Nexus turns claims into proof with living skill passports, AI verification, and shareable credibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="gradient-border-card p-5">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className="text-sm text-white/65 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/skills" className="text-sm text-white/65 hover:text-white transition-colors">
                  Skills
                </Link>
              </li>
              <li>
                <Link href="/verification" className="text-sm text-white/65 hover:text-white transition-colors">
                  Verification
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-sm text-white/65 hover:text-white transition-colors">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div className="gradient-border-card p-5">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-white/65 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-white/65 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-sm text-white/65 hover:text-white transition-colors">
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          <div className="gradient-border-card p-5">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className="text-sm text-white/65 hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-white/65 hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          <div className="gradient-border-card p-5">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-sm text-white/65 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <p className="text-sm text-white/55">
            © {new Date().getFullYear()} Nexus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
