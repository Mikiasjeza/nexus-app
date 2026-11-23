'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'

type Item = {
  id: string
  title: string
  body: string | null
  href: string | null
  readAt: string | null
  createdAt: string
}

const POLL_MS = 60_000

/** The bell in the header: unread count, and the latest notifications in a menu. */
export default function NotificationBell() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch {
      // Offline or signed out: keep what we have.
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      }).catch(() => {})
    }
  }

  return (
    <div className="relative flex" ref={box}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex h-12 w-12 items-center justify-center border-l border-rule text-ink transition-colors duration-150 hover:bg-lavender hover:text-[#0b0b0b]"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-2 top-2 min-w-[1.1rem] rounded-full bg-verified px-1 text-center text-[0.65rem] font-semibold leading-[1.1rem] text-[#0b0b0b]"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 max-h-[70vh] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto border border-rule bg-ground"
        >
          <p className="border-b border-line px-4 py-3 text-sm font-medium">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-muted">Nothing yet.</p>
          ) : (
            <ul>
              {items.map((n) => {
                const content = (
                  <>
                    <span className={`block text-sm ${n.readAt ? 'text-ink-muted' : 'text-ink'}`}>
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block truncate text-xs text-ink-faint">{n.body}</span>
                    )}
                    <span className="mt-1 block text-[0.7rem] text-ink-faint">
                      {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </>
                )
                return (
                  <li key={n.id} className="border-b border-line last:border-b-0">
                    {n.href ? (
                      <Link
                        href={n.href}
                        role="menuitem"
                        className="block px-4 py-3 transition-colors hover:bg-raised"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
