'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface TooltipProps {
  children: ReactNode
  content: string | ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  // One pending timer at a time: a click fires both mouseenter and focus, and a
  // second timer left running would reopen the tooltip after hide.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const show = () => {
    clearTimer()
    timer.current = setTimeout(() => setIsVisible(true), delay)
  }

  const hide = () => {
    clearTimer()
    setIsVisible(false)
  }

  useEffect(() => clearTimer, [])

  return (
    <div
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`page-enter pointer-events-none absolute z-50 ${positions[position]} whitespace-nowrap rounded-lg border border-line bg-[#1d1b18] px-3 py-1.5 text-sm text-ink`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
