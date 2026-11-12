'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, LogOut, Shield, User as UserIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { clsx } from 'clsx'
import { useUser } from '@/lib/hooks/useUser'
import NexusLogo from '@/components/UI/NexusLogo'

const MARKETING_PATHS = new Set([
  '/',
  '/about',
  '/how-it-works',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
  '/cookies',
])
const MARKETING_PREFIXES = ['/company/', '/share/', '/auth/']

function isMarketing(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true
  return MARKETING_PREFIXES.some((p) => pathname.startsWith(p))
}

const marketingNav = [
  { href: '/about', label: 'About' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/assessments', label: 'Assessments' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
]

const appNav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/skills', label: 'Skills' },
  { href: '/assessments', label: 'Assessments' },
  { href: '/verification', label: 'Verification' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/employer/dashboard', label: 'Employer' },
  { href: '/settings', label: 'Settings' },
]

// A nav cell: full bar height, divided from its neighbours by a rule, filling lavender on hover.
const navLinkClass = (active: boolean) =>
  clsx(
    'inline-flex h-12 items-center border-l border-ink px-4 text-[0.9375rem] font-medium tracking-[-0.02em] transition-colors duration-150 xl:px-5',
    active ? 'bg-ink text-ground' : 'text-ink hover:bg-lavender'
  )

/** One floating pill bar: wordmark, navigation, account. */
export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, loading: userLoading } = useUser()

  const marketing = isMarketing(pathname)
  const navItems = marketing ? marketingNav : appNav

  useEffect(() => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen && !userMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
        setUserMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen, userMenuOpen])

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

  const menuItemClass =
    'flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors duration-150 hover:bg-lavender'

  // The phone menu also carries the links the bar shows as buttons.
  const mobileItems = [
    ...navItems,
    ...(!marketing && user?.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
    ...(marketing
      ? user
        ? [{ href: '/dashboard', label: 'Dashboard' }]
        : [
            { href: '/auth/login', label: 'Log in' },
            { href: '/auth/register', label: 'Start your passport' },
          ]
      : []),
  ]

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? '?')

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink bg-ground">
      <nav aria-label="Primary" className="flex h-12 items-stretch justify-between">
        <div className="flex items-stretch">
          <Link href={user ? '/dashboard' : '/'} className="flex" aria-label="Nexus home">
            <NexusLogo size={48} />
          </Link>
          {marketing && !userLoading && !user && (
            <Link
              href="/auth/register"
              className="hidden h-12 items-center gap-6 bg-verified px-4 text-[0.9375rem] font-medium tracking-[-0.02em] text-[#0b0b0b] transition-colors duration-150 hover:bg-ink hover:text-ground sm:inline-flex"
            >
              Start your passport <span aria-hidden>+</span>
            </Link>
          )}
        </div>

        <div className="flex items-stretch">
          <div className="hidden items-stretch lg:flex">
            {navItems.map((item) => {
              const active = isNavItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={navLinkClass(active)}
                >
                  {item.label}
                </Link>
              )
            })}
            {marketing &&
              !userLoading &&
              (user ? (
                <Link href="/dashboard" className={navLinkClass(false)}>
                  Dashboard
                </Link>
              ) : (
                <Link href="/auth/login" className={navLinkClass(false)}>
                  Log in
                </Link>
              ))}
          </div>

          {!marketing && user && (
            <div className="relative flex" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex h-12 w-12 items-center justify-center border-l border-ink text-xs font-semibold text-ink transition-colors duration-150 hover:bg-lavender"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                {initials}
              </button>
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-12 w-60 border border-ink bg-ground"
                >
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-sm font-medium text-ink">
                      {user.name || user.email}
                    </p>
                    {user.name && <p className="truncate text-xs text-ink-muted">{user.email}</p>}
                  </div>
                  <Link href="/settings" role="menuitem" className={menuItemClass}>
                    <UserIcon className="h-4 w-4" aria-hidden />
                    Profile and settings
                  </Link>
                  {user.isAdmin && (
                    <Link href="/admin" role="menuitem" className={menuItemClass}>
                      <Shield className="h-4 w-4" aria-hidden />
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className={`${menuItemClass} w-full`}
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-12 items-center gap-2 border-l border-ink px-4 text-[0.9375rem] font-medium text-ink lg:hidden"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-mobile-navigation"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <Menu className="h-4 w-4" aria-hidden />
            )}
            Menu
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div
          id="primary-mobile-navigation"
          className="on-ink flex max-h-[calc(100vh-3rem)] flex-col overflow-y-auto lg:hidden"
        >
          {mobileItems.map((item) => {
            const active = isNavItemActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'border-b border-line px-4 py-3.5 text-xl font-medium tracking-[-0.03em]',
                  active ? 'text-verified' : 'text-ink'
                )}
              >
                {item.label}
              </Link>
            )
          })}
          {!marketing && user && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-3.5 text-left text-xl font-medium tracking-[-0.03em] text-ink-muted"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  )
}
