'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Fades and lifts its content in once it scrolls into view. Skipped entirely
 * for people who prefer reduced motion, and visible without JavaScript.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setState('hidden')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={
        state === 'static'
          ? undefined
          : {
              opacity: state === 'shown' ? 1 : 0,
              transform: state === 'shown' ? 'none' : 'translateY(16px)',
              transition: `opacity 600ms cubic-bezier(0.2,0.7,0.2,1) ${delay}ms, transform 600ms cubic-bezier(0.2,0.7,0.2,1) ${delay}ms`,
            }
      }
    >
      {children}
    </div>
  )
}
