'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { clsx } from 'clsx'
import NexusLogo from '@/components/UI/NexusLogo'
import { useUser } from '@/lib/hooks/useUser'

const SCROLL_SOLID_AT = 16

const MARKETING_PATHS = new Set([
  '/',
  '/about',
  '/how-it-works',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
])
const MARKETING_PREFIXES = ['/company/', '/share/', '/auth/']

function isMarketing(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true
  return MARKETING_PREFIXES.some((p) => pathname.startsWith(p))
}

const marketingNav = [
  { href: '/about', label: 'About' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
]

const appNav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/skills', label: 'Skills' },
  { href: '/verification', label: 'Verification' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/employer/dashboard', label: 'Employer' },
  { href: '/settings', label: 'Settings' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const scrollRaf = useRef<number | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, loading: userLoading } = useUser()

  const marketing = isMarketing(pathname)
  const navItems = marketing ? marketingNav : appNav

  const updateScrolled = useCallback(() => {
    if (scrollRaf.current != null) return
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null
      const next = window.scrollY > SCROLL_SOLID_AT
      setScrolled((prev) => (prev === next ? prev : next))
    })
  }, [])

  useEffect(() => {
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateScrolled)
      if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current)
    }
  }, [updateScrolled])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!userMenuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [userMenuOpen])

  const isNavItemActive = useCallback(
    (href: string) => {
      if (href === '/employer/dashboard') {
        return pathname === href || pathname.startsWith('/employer/')
      }
      return pathname === href || pathname.startsWith(`${href}/`)
    },
    [pathname]
  )

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    router.push('/')
    router.refresh()
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? '?')

  return (
    <header
      className={clsx(
        'fixed left-0 right-0 top-0 z-50 h-16 border-b transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ease-out',
        scrolled
          ? 'border-white/[0.08] bg-[rgba(5,7,12,0.88)] shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent bg-transparent'
      )}
    >
      <nav className="mx-auto flex h-full max-w-7xl flex-col px-6 lg:px-12">
        <div className="flex h-16 items-center justify-between">
          <NexusLogo size="default" interactive />

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'relative pb-1 text-[13px] font-medium tracking-[0.02em] transition-colors duration-200',
                    isActive ? 'text-white' : 'text-white/55 hover:text-white/90',
                    'after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-gradient-to-r after:from-cyan-400/90 after:via-violet-400/90 after:to-rose-400/90 after:transition-transform after:duration-200 after:ease-out',
                    'hover:after:scale-x-100',
                    isActive && 'after:scale-x-100'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Desktop right side: auth CTAs or user avatar */}
          <div className="hidden items-center gap-3 md:flex">
            {marketing
              ? !userLoading &&
                (user ? (
                  <Link
                    href="/dashboard"
                    className="button-base button-primary h-9 rounded-lg px-4 text-xs font-medium"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-[13px] font-medium text-white/60 transition-colors hover:text-white"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/register"
                      className="button-base button-primary h-9 rounded-lg px-4 text-xs font-medium"
                    >
                      Sign up free
                    </Link>
                  </>
                ))
              : user && (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((o) => !o)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/60 to-violet-500/60 text-xs font-semibold text-white ring-1 ring-white/20 transition-opacity hover:opacity-80"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                      aria-label="User menu"
                    >
                      {initials}
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-10 w-52 rounded-xl border border-white/[0.08] bg-[rgba(5,7,12,0.96)] py-1 shadow-2xl backdrop-blur-xl">
                        <div className="border-b border-white/[0.06] px-3 py-2.5">
                          <p className="truncate text-[13px] font-medium text-white">
                            {user.name || user.email}
                          </p>
                          {user.name && (
                            <p className="truncate text-[11px] text-white/40">{user.email}</p>
                          )}
                        </div>
                        <Link
                          href="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <UserIcon className="h-3.5 w-3.5" />
                          Profile &amp; Settings
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="p-2 text-white transition-opacity hover:opacity-80 md:hidden"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-mobile-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          id="primary-mobile-navigation"
          className={clsx(
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-out md:hidden',
            mobileMenuOpen ? 'max-h-[min(70vh,30rem)] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="flex flex-col gap-1 border-t border-white/[0.06] bg-[rgba(5,7,12,0.95)] py-4 backdrop-blur-md">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}

            {/* Mobile auth section */}
            {marketing && !userLoading && (
              <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] px-3 pt-3">
                {user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="button-base button-primary rounded-lg px-4 py-2.5 text-center text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="button-base button-primary rounded-lg px-4 py-2.5 text-center text-sm font-medium"
                    >
                      Sign up free
                    </Link>
                  </>
                )}
              </div>
            )}

            {!marketing && user && (
              <div className="mt-2 border-t border-white/[0.06] px-3 pt-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
