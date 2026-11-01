'use client'

import { ReactNode, useState } from 'react'

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
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const show = () => {
    setTimeoutId(setTimeout(() => setIsVisible(true), delay))
  }

  const hide = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsVisible(false)
  }

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
