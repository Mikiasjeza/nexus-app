'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, useEffect } from 'react'
import Link from 'next/link'

/**
 * 3D Nexus Logo
 * Represents: Skills connecting, AI intelligence, growth, evolution
 * MetaLab-style: Real, interactive, responds to cursor
 */
export default function NexusLogo({ 
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

  // Node positions for nexus structure
  const nodes = [
    { id: 'center', x: 50, y: 50, z: 0, size: 8, color: '#9333ea' },
    { id: 'top', x: 50, y: 20, z: 10, size: 5, color: '#00d9ff' },
    { id: 'right', x: 80, y: 50, z: -5, size: 5, color: '#ff6f91' },
    { id: 'bottom', x: 50, y: 80, z: 5, size: 5, color: '#5eead4' },
    { id: 'left', x: 20, y: 50, z: -10, size: 5, color: '#ffc46b' },
    { id: 'front', x: 50, y: 40, z: 15, size: 4, color: '#f472b6' },
    { id: 'back', x: 50, y: 60, z: -15, size: 4, color: '#818cf8' },
  ]

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
      animate={{
        rotateZ: [0, 1.2, -1, 0],
        y: [0, -1.5, 0, 1, 0],
      }}
      transition={{
        rotateZ: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
        y: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{
          filter: 'drop-shadow(0 4px 20px rgba(139, 92, 246, 0.25)) drop-shadow(0 10px 40px rgba(0, 0, 0, 0.15))',
        }}
      >
        <defs>
          {/* Gradients for nodes */}
          <radialGradient id="centerGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#9333ea" />
          </radialGradient>
          <radialGradient id="nodeGradient1" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#00d9ff" />
          </radialGradient>
          <radialGradient id="nodeGradient2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#ff6f91" />
          </radialGradient>
          <radialGradient id="nodeGradient3" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#99f6e4" />
            <stop offset="100%" stopColor="#5eead4" />
          </radialGradient>
          <radialGradient id="nodeGradient4" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#ffc46b" />
          </radialGradient>
          <radialGradient id="nodeGradient5" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="100%" stopColor="#f472b6" />
          </radialGradient>
          <radialGradient id="nodeGradient6" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#818cf8" />
          </radialGradient>
          
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines - represent skill relationships */}
        {nodes.slice(1).map((node) => (
          <motion.line
            key={`line-${node.id}`}
            x1="50"
            y1="50"
            x2={node.x}
            y2={node.y}
            stroke={node.color}
            strokeWidth="1.5"
            opacity="0.3"
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0.85, 1, 0.85],
              opacity: [0.18, 0.45, 0.18],
            }}
            transition={{
              pathLength: { duration: 2.2, delay: 0.2, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 2.2, delay: 0.2, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        ))}

        {/* Outer nodes - skills, growth, verification, analytics */}
        {nodes.slice(1).map((node, index) => (
          <motion.circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={node.size}
            fill={`url(#nodeGradient${Math.min(index + 1, 6)})`}
            filter="url(#glow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [1, 1.08, 1],
              opacity: [0.82, 1, 0.82],
            }}
            transition={{
              scale: { duration: 2.4, delay: index * 0.2, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 2.4, delay: index * 0.2, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        ))}

        {/* Central AI node - the nexus core */}
        <motion.circle
          cx="50"
          cy="50"
          r="8"
          fill="url(#centerGradient)"
          filter="url(#glow)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: 1,
          }}
          transition={{
            scale: { 
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            },
            opacity: { 
              duration: 0.6,
            },
          }}
        >
          <animate
            attributeName="r"
            values="8;9;8"
            dur="3s"
            repeatCount="indefinite"
          />
        </motion.circle>

        {/* Inner core pulse - AI intelligence */}
        <motion.circle
          cx="50"
          cy="50"
          r="4"
          fill="white"
          opacity="0.8"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Energy flow lines - connecting nodes */}
        {nodes.slice(1, 4).map((node, index) => (
          <motion.path
            key={`flow-${node.id}`}
            d={`M 50 50 L ${node.x} ${node.y}`}
            stroke="white"
            strokeWidth="1"
            opacity="0.2"
            strokeDasharray="2 2"
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 2,
              delay: index * 0.3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
      
        {/* Ambient glow - chromatic core */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl opacity-30 dark:opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.35) 0%, rgba(147, 51, 234, 0.28) 35%, rgba(255, 111, 145, 0.18) 55%, transparent 72%)',
          transform: 'translateZ(-10px)',
        }}
        animate={{
          opacity: [0.2, 0.42, 0.2],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: '1px solid rgba(0, 217, 255, 0.35)',
          transform: 'translateZ(-8px)',
        }}
        animate={{
          scale: [0.95, 1.2, 0.95],
          opacity: [0, 0.4, 0],
        }}
        transition={{
          duration: 3.6,
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
