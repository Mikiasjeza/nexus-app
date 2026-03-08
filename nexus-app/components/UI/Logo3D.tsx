'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, useEffect } from 'react'
import Link from 'next/link'

/**
 * 3D Interactive Shield Logo
 * MetaLab-style: Real, interactive, responds to cursor
 * Gradient shield with "S" negative space
 */
export default function Logo3D({ 
  size = 'default',
  interactive = true,
  className = '',
}: {
  size?: 'small' | 'default' | 'large'
  interactive?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  
  // Motion values for 3D rotation
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), { stiffness: 300, damping: 30 })
  
  // Scale on hover
  const scale = useSpring(useMotionValue(1), { stiffness: 300, damping: 30 })

  useEffect(() => {
    if (!interactive || !ref.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return
      
      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Normalize to -0.5 to 0.5
      const normalizedX = (e.clientX - centerX) / rect.width
      const normalizedY = (e.clientY - centerY) / rect.height
      
      x.set(normalizedX)
      y.set(normalizedY)
    }

    const handleMouseEnter = () => {
      scale.set(1.05)
    }

    const handleMouseLeave = () => {
      scale.set(1)
      x.set(0)
      y.set(0)
    }

    const element = ref.current
    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [interactive, x, y, scale])

  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-20 h-20',
  }

  const LogoContent = (
    <motion.div
      ref={ref}
      className={`relative ${sizeClasses[size]} ${className}`}
      style={{
        rotateX: rotateX as any,
        rotateY: rotateY as any,
        scale: scale as any,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Shield with gradient */}
      <motion.div
        className="absolute inset-0"
        style={{
          transform: 'translateZ(20px)',
        }}
      >
        <svg
          viewBox="0 0 120 140"
          className="w-full h-full"
          style={{
            filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2))',
          }}
        >
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" /> {/* Purple */}
              <stop offset="25%" stopColor="#3b82f6" /> {/* Blue */}
              <stop offset="50%" stopColor="#06b6d4" /> {/* Cyan */}
              <stop offset="75%" stopColor="#10b981" /> {/* Green */}
              <stop offset="100%" stopColor="#84cc16" /> {/* Lime */}
            </linearGradient>
            <linearGradient id="shieldGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="75%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#a3e635" />
            </linearGradient>
          </defs>
          
          {/* Shield shape with 3D layers */}
          {/* Back layer (shadow) */}
          <path
            d="M 60 10 Q 90 10 105 30 Q 110 50 110 70 Q 110 100 90 120 Q 70 130 60 135 Q 50 130 30 120 Q 10 100 10 70 Q 10 50 15 30 Q 30 10 60 10 Z"
            fill="url(#shieldGradient)"
            opacity="0.3"
            transform="translate(2, 2)"
          />
          
          {/* Main shield */}
          <path
            d="M 60 10 Q 90 10 105 30 Q 110 50 110 70 Q 110 100 90 120 Q 70 130 60 135 Q 50 130 30 120 Q 10 100 10 70 Q 10 50 15 30 Q 30 10 60 10 Z"
            fill="url(#shieldGradient)"
            className="transition-all duration-300"
          />
          
          {/* Highlight layer for 3D effect */}
          <path
            d="M 60 10 Q 85 12 98 30 Q 105 45 108 65 Q 108 90 92 110 Q 75 125 60 130 Q 45 125 28 110 Q 12 90 12 65 Q 15 45 22 30 Q 35 12 60 10 Z"
            fill="url(#shieldGradientLight)"
            opacity="0.4"
          />
          
          {/* Bold, flowing uppercase S - single continuous path for maximum visibility */}
          <path
            d="M 30 30
               C 20 25, 18 30, 22 40
               C 26 50, 36 55, 46 55
               C 56 55, 66 50, 70 40
               C 74 30, 72 25, 64 25
               C 56 25, 48 30, 46 40
               C 44 50, 52 55, 62 55
               C 72 55, 78 50, 76 40
               C 74 30, 66 25, 58 30
               C 50 35, 48 45, 52 55
               C 56 65, 66 70, 76 65
               C 86 60, 88 70, 82 80
               C 76 90, 64 95, 54 95
               C 44 95, 34 90, 28 80
               C 22 70, 26 60, 36 60
               C 46 60, 56 55, 60 65
               C 64 75, 56 80, 46 80
               C 36 80, 28 75, 32 65
               C 36 55, 46 50, 56 55
               C 66 60, 74 55, 70 45
               C 66 35, 56 30, 46 35
               C 36 40, 30 40, 30 30 Z"
            fill="white"
            opacity="1"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          
          {/* Inner highlight for depth and visibility */}
          <path
            d="M 35 35
               C 28 32, 26 36, 29 44
               C 32 52, 40 56, 48 56
               C 56 56, 64 52, 67 44
               C 70 36, 68 32, 62 32
               C 56 32, 50 36, 48 44
               C 46 52, 52 56, 60 56
               C 68 56, 74 52, 72 44
               C 70 36, 64 32, 58 36
               C 52 40, 50 48, 53 56
               C 56 64, 64 68, 72 64
               C 80 60, 82 68, 78 76
               C 74 84, 64 88, 56 88
               C 48 88, 40 84, 36 76
               C 32 68, 36 60, 44 60
               C 52 60, 60 56, 63 64
               C 66 72, 60 76, 52 76
               C 44 76, 38 72, 40 64
               C 42 56, 52 52, 60 56
               C 68 60, 74 56, 71 48
               C 68 40, 60 36, 52 40
               C 44 44, 38 44, 35 35 Z"
            fill="white"
            opacity="0.4"
          />
        </svg>
      </motion.div>
      
      {/* Ambient glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl opacity-20"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          transform: 'translateZ(-10px)',
        }}
        animate={{
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  )

  if (interactive) {
    return (
      <Link href="/" className="inline-block">
        {LogoContent}
      </Link>
    )
  }

  return LogoContent
}
