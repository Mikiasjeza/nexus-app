'use client'

import { useEffect, useState } from 'react'

/**
 * Hook for scroll-triggered animations that are scrubbed to scroll position
 * Provides smooth, gliding motion tied to scroll progress
 */
export function useScroll() {
  const [scrollY, setScrollY] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? currentScroll / maxScroll : 0

      setScrollY(currentScroll)
      setScrollProgress(progress)
    }

    handleScroll() // Initial call
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { scrollY, scrollProgress }
}

/**
 * Hook for smooth scroll-based motion values
 * Returns scroll position for use with Framer Motion
 */
export function useScrollMotion() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { scrollY }
}

/**
 * Hook for element-based scroll progress (0-1)
 * Returns progress of element through viewport
 */
export function useElementScrollProgress(ref: React.RefObject<HTMLElement>) {
  const { scrollY } = useScrollMotion()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!ref.current) return

    const updateProgress = () => {
      const element = ref.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      const elementTop = rect.top + window.scrollY
      const elementHeight = rect.height
      const viewportHeight = window.innerHeight

      const scrollPosition = window.scrollY
      const start = elementTop - viewportHeight
      const end = elementTop + elementHeight

      const currentProgress = Math.max(
        0,
        Math.min(1, (scrollPosition - start) / (end - start))
      )

      setProgress(currentProgress)
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [ref])

  return progress
}
