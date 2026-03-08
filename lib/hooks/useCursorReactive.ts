'use client'

import { useEffect, useState } from 'react'

interface CursorPosition {
  x: number
  y: number
}

export function useCursorReactive() {
  const [cursor, setCursor] = useState<CursorPosition>({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursor({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return cursor
}

export function useCursorProximity(
  ref: React.RefObject<HTMLElement>,
  threshold: number = 200
) {
  const cursor = useCursorReactive()
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distance = Math.sqrt(
      Math.pow(cursor.x - centerX, 2) + Math.pow(cursor.y - centerY, 2)
    )

    setIsNear(distance < threshold)
  }, [cursor, ref, threshold])

  return isNear
}
