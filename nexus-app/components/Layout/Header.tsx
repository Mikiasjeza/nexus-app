'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useScroll, useTransform, useMotionTemplate } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { navHover, easing } from '@/lib/utils/animations'
import NexusLogo from '@/components/UI/NexusLogo'

export default function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { scrollY } = useScroll()

  // Navigation becomes solid after 40-60px scroll (premium control surface)
  const headerOpacity = useTransform(scrollY, [0, 50], [0, 0.95])
  const headerBlur = useTransform(scrollY, [0, 50], [0, 12])
  const headerHeight = useTransform(scrollY, [0, 50], [80, 64])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/skills', label: 'Skills' },
    { href: '/verification', label: 'Verification' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/settings', label: 'Settings' },
  ]

  const borderOpacity = useTransform(scrollY, [0, 50], [0, 1])
  const headerBackground = useMotionTemplate`rgba(255, 255, 255, ${headerOpacity})`
  const headerBackdrop = useMotionTemplate`blur(${headerBlur}px)`
  const headerBorder = useMotionTemplate`1px solid rgba(0, 0, 0, ${borderOpacity})`

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: headerBackground as any,
        backdropFilter: headerBackdrop as any,
        height: headerHeight as any,
        borderBottom: headerBorder as any,
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-12 h-full">
        <div className="flex items-center justify-between h-full">
          {/* 3D Nexus Logo - MetaLab style */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 8 } : false}
            animate={isMounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: easing.primary }}
          >
            <NexusLogo size="default" interactive={true} />
          </motion.div>

          {/* Desktop Navigation - Control Surface */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href
              return (
                <motion.div
                  key={item.href}
                  initial={isMounted ? { opacity: 0, y: -10 } : false}
                  animate={isMounted ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: easing.primary,
                  }}
                >
                  <Link
                    href={item.href}
                    className="relative text-sm font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors duration-300"
                  >
                    <motion.span
                      className="relative inline-block"
                      whileHover={{ y: -1 }}
                      transition={{ duration: 0.2, ease: easing.primary }}
                    >
                      {item.label}
                      {/* Active indicator */}
                      {isActive && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute -bottom-1 left-0 right-0 h-[1px] bg-black dark:bg-white"
                          initial={false}
                          transition={{ duration: 0.3, ease: easing.primary }}
                        />
                      )}
                      {/* Underline draw on hover - left to right */}
                      <motion.span
                        className="absolute -bottom-1 left-0 h-[1px] bg-black dark:bg-white origin-left"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.2, ease: easing.primary }}
                      />
                    </motion.span>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            initial={isMounted ? { opacity: 0 } : false}
            animate={isMounted ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="md:hidden p-2 text-black dark:text-white hover:opacity-70 transition-opacity"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={{
            height: mobileMenuOpen ? 'auto' : 0,
            opacity: mobileMenuOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: easing.primary }}
          className="md:hidden overflow-hidden border-t border-black/10 dark:border-white/10"
        >
          <div className="flex flex-col gap-4 py-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    text-sm font-medium transition-colors
                    ${isActive
                      ? 'text-black dark:text-white'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }
                  `}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </motion.div>
      </nav>
    </motion.header>
  )
}
