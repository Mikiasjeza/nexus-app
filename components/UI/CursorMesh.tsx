'use client'

import { useCursorReactive } from '@/lib/hooks/useCursorReactive'
import { useEffect, useRef, useCallback, memo } from 'react'

/**
 * Cursor-reactive gradients without Framer — updates DOM styles on rAF only.
 */
function CursorMesh() {
  const cursor = useCursorReactive()
  const cursorRef = useRef(cursor)
  cursorRef.current = cursor
  const containerRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLDivElement>(null)
  const secondaryRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef({ x: 50, y: 50, cx: 50, cy: 50 })

  const flush = useCallback(() => {
    rafRef.current = null
    const { x, y, cx, cy } = pendingRef.current
    const p = primaryRef.current
    const s = secondaryRef.current
    if (p) {
      p.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(0, 217, 255, 0.16), rgba(147, 51, 234, 0.1) 35%, rgba(0, 0, 0, 0.06) 60%, transparent 75%)`
    }
    if (s) {
      s.style.background = `radial-gradient(circle at ${cx}% ${cy}%, rgba(255, 111, 145, 0.14), rgba(255, 196, 107, 0.06) 35%, transparent 65%)`
    }
  }, [])

  const schedule = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(flush)
  }, [flush])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
      pendingRef.current.x = x
      pendingRef.current.y = y
      const w = typeof window !== 'undefined' ? window.innerWidth : 1
      const h = typeof window !== 'undefined' ? window.innerHeight : 1
      const c = cursorRef.current
      pendingRef.current.cx = Math.max(0, Math.min(100, (c.x / w) * 100))
      pendingRef.current.cy = Math.max(0, Math.min(100, (c.y / h) * 100))
      schedule()
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    flush()
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [schedule, flush])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        ref={primaryRef}
        className="absolute inset-0 opacity-[0.28] will-change-[background] dark:opacity-[0.42]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(0, 217, 255, 0.12), rgba(147, 51, 234, 0.08) 35%, transparent 70%)',
        }}
      />
      <div
        ref={secondaryRef}
        className="absolute inset-0 opacity-[0.14] will-change-[background] dark:opacity-[0.22]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255, 111, 145, 0.12), transparent 65%)',
        }}
      />
      <div
        className="cursor-mesh-slow-spin pointer-events-none absolute inset-0 mix-blend-screen opacity-[0.07] dark:opacity-[0.12]"
        style={{
          background:
            'conic-gradient(from 0deg at 50% 50%, rgba(0, 217, 255, 0.45), rgba(147, 51, 234, 0.4), rgba(255, 111, 145, 0.4), rgba(0, 217, 255, 0.45))',
        }}
      />
    </div>
  )
}

export default memo(CursorMesh)
