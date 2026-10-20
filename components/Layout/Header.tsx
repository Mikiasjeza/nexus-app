'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { clsx } from 'clsx'
import { useUser } from '@/lib/hooks/useUser'

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

const navLinkClass = (active: boolean) =>
  clsx(
    'inline-flex h-8 items-center rounded-full px-3 text-sm transition-colors duration-150',
    active ? 'bg-pill text-ink' : 'text-ink-muted hover:text-ink'
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

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? '?')

  const authActions =
    !userLoading &&
    (user ? (
      <Link href="/dashboard" className="pill">
        Dashboard
      </Link>
    ) : (
      <>
        <Link href="/auth/login" className={navLinkClass(false)}>
          Log in
        </Link>
        <Link href="/auth/register" className="pill" data-active="true">
          Sign up free
        </Link>
      </>
    ))

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3">
      <nav
        aria-label="Primary"
        className="mx-auto max-w-[60rem] rounded-[1.375rem] bg-[rgba(24,23,25,0.86)] p-1.5 backdrop-blur-md"
      >
        <div className="flex h-9 items-center justify-between gap-2">
          <Link
            href={user ? '/dashboard' : '/'}
            className="inline-flex h-8 items-center rounded-full px-3 text-[0.9375rem] font-medium tracking-[-0.01em] text-ink"
          >
            Nexus
          </Link>

          <div className="hidden items-center lg:flex">
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
          </div>

          <div className="flex items-center gap-1">
            {marketing ? (
              <div className="hidden items-center gap-1 lg:flex">{authActions}</div>
            ) : (
              user && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-pill text-xs font-medium text-ink transition-colors duration-150 hover:bg-pill-hover"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    {initials}
                  </button>
                  {userMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-11 w-56 origin-top-right rounded-2xl bg-raised p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                    >
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm text-ink">{user.name || user.email}</p>
                        {user.name && (
                          <p className="truncate text-xs text-ink-faint">{user.email}</p>
                        )}
                      </div>
                      <Link
                        href="/settings"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-pill hover:text-ink"
                      >
                        <UserIcon className="h-4 w-4" aria-hidden />
                        Profile and settings
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-pill hover:text-ink"
                      >
                        <LogOut className="h-4 w-4" aria-hidden />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )
            )}

            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-pill px-3 text-sm text-ink lg:hidden"
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
        </div>

        {mobileMenuOpen && (
          <div
            id="primary-mobile-navigation"
            className="flex flex-col gap-0.5 px-1 pb-1 pt-2 lg:hidden"
          >
            {navItems.map((item) => {
              const active = isNavItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'rounded-xl px-3 py-2.5 text-base transition-colors duration-150',
                    active ? 'bg-pill text-ink' : 'text-ink-muted hover:text-ink'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            {marketing && <div className="flex gap-2 px-1 pt-2">{authActions}</div>}
            {!marketing && user && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base text-ink-muted hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
