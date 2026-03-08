'use client'

import { motion } from 'framer-motion'
import { useCursorReactive } from '@/lib/hooks/useCursorReactive'
import { useEffect, useRef, useState, useCallback, memo } from 'react'

/**
 * Cursor-reactive mesh/gradient background
 * Subtle, high-quality motion that reacts gently to cursor movement
 * Used in hero sections for interactive layer
 */
function CursorMesh() {
  const cursor = useCursorReactive()
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  // Debounced mouse position update for performance
  const updateMousePosition = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    
    setMousePos({ x, y })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    // Use requestAnimationFrame for smooth, performant updates
    let rafId: number | null = null
    
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => updateMousePosition(e))
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [updateMousePosition])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Primary bioluminescent field */}
      <motion.div
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.4] will-change-[background]"
        animate={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0, 217, 255, 0.18), rgba(147, 51, 234, 0.12) 35%, rgba(0, 0, 0, 0.08) 60%, transparent 75%)`,
        }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Secondary heat map - follows native cursor hook for depth */}
      <motion.div
        className="absolute inset-0 opacity-[0.12] dark:opacity-[0.2] will-change-[background]"
        animate={{
          background: `radial-gradient(circle at ${Math.max(0, Math.min(100, (cursor.x / (typeof window !== 'undefined' ? window.innerWidth : 1)) * 100))}% ${Math.max(0, Math.min(100, (cursor.y / (typeof window !== 'undefined' ? window.innerHeight : 1)) * 100))}%, rgba(255, 111, 145, 0.18), rgba(255, 196, 107, 0.08) 35%, transparent 65%)`,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Slow atmospheric drift for "alive" feeling */}
      <motion.div
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.14] mix-blend-screen"
        style={{
          background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 217, 255, 0.5), rgba(147, 51, 234, 0.45), rgba(255, 111, 145, 0.45), rgba(0, 217, 255, 0.5))',
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.08, 1],
        }}
        transition={{
          rotate: { duration: 28, repeat: Infinity, ease: 'linear' },
          scale: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
    </div>
  )
}

export default memo(CursorMesh)
