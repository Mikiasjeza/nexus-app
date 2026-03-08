'use client'

import { useState, useEffect, useCallback } from 'react'

interface CursorPosition {
  x: number
  y: number
}

interface CursorState {
  position: CursorPosition
  isHovering: boolean
  target: Element | null
}

export function useCursor() {
  const [cursorState, setCursorState] = useState<CursorState>({
    position: { x: 0, y: 0 },
    isHovering: false,
    target: null,
  })

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      setCursorState((prev) => ({
        ...prev,
        position: { x: e.clientX, y: e.clientY },
      }))
    }

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as Element
      const isInteractive = target.matches('button, a, input, textarea, select, [role="button"], [data-interactive]')
      
      setCursorState((prev) => ({
        ...prev,
        isHovering: isInteractive,
        target: isInteractive ? target : null,
      }))
    }

    const handleMouseLeave = () => {
      setCursorState((prev) => ({
        ...prev,
        isHovering: false,
        target: null,
      }))
    }

    window.addEventListener('mousemove', updateCursor, { passive: true })
    document.addEventListener('mouseenter', handleMouseEnter, true)
    document.addEventListener('mouseleave', handleMouseLeave, true)

    return () => {
      window.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mouseenter', handleMouseEnter, true)
      document.removeEventListener('mouseleave', handleMouseLeave, true)
    }
  }, [])

  return cursorState
}

export function useMagneticEffect(strength: number = 0.3) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const distanceX = (e.clientX - centerX) * strength
      const distanceY = (e.clientY - centerY) * strength

      setPosition({ x: distanceX, y: distanceY })
    },
    [strength]
  )

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 })
  }, [])

  return { position, handleMouseMove, handleMouseLeave }
}
