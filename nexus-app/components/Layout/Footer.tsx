'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-[2px]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="mb-10">
          <p className="text-sm text-black/60 dark:text-white/60">
            Nexus helps you present verified skills with clarity and confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="border border-black/10 dark:border-white/10 p-5">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4 uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/skills" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Skills
                </Link>
              </li>
              <li>
                <Link href="/verification" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Verification
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div className="border border-black/10 dark:border-white/10 p-5">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4 uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          <div className="border border-black/10 dark:border-white/10 p-5">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          <div className="border border-black/10 dark:border-white/10 p-5">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4 uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-black/10 dark:border-white/10">
          <p className="text-sm text-black/60 dark:text-white/60">
            © {new Date().getFullYear()} Nexus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
