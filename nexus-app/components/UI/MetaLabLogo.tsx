'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { easing } from '@/lib/utils/animations'

/**
 * MetaLab-style 3D logo animation
 * Exact implementation: 3D icon that spins/rotates subtly on page load
 * Draws you in with motion before any text appears
 */
export default function MetaLabLogo() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <motion.div
      className="relative w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40"
      initial={false}
      animate={isMounted ? {
        rotateY: [0, 360],
        rotateX: [0, 15, 0],
        scale: [0.8, 1],
        opacity: [0, 1],
      } : {}}
      transition={{
        rotateY: {
          duration: 2,
          ease: [0.22, 1, 0.36, 1],
          repeat: Infinity,
          repeatType: 'loop',
        },
        rotateX: {
          duration: 3,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        },
        scale: {
          duration: 1.2,
          ease: [0.22, 1, 0.36, 1],
        },
        opacity: {
          duration: 1,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {/* 3D Passport Icon - MetaLab exact style: subtle continuous rotation */}
      <motion.div
        className="relative w-full h-full"
        animate={{
          rotateY: [0, 360],
        }}
        transition={{
          rotateY: {
            duration: 20,
            ease: 'linear',
            repeat: Infinity,
          },
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 rounded-2xl shadow-2xl flex items-center justify-center border border-black/10 dark:border-white/10"
          style={{
            transform: 'translateZ(20px)',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="text-white dark:text-black text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            SP
          </div>
        </div>

        {/* Top face */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-200 rounded-2xl"
          style={{
            transform: 'rotateX(90deg) translateZ(20px)',
            transformOrigin: 'bottom',
            backfaceVisibility: 'hidden',
          }}
        />

        {/* Right face */}
        <div
          className="absolute inset-0 bg-gradient-to-l from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-100 rounded-2xl"
          style={{
            transform: 'rotateY(90deg) translateZ(20px)',
            transformOrigin: 'left',
            backfaceVisibility: 'hidden',
          }}
        />

        {/* Left face */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-100 rounded-2xl"
          style={{
            transform: 'rotateY(-90deg) translateZ(20px)',
            transformOrigin: 'right',
            backfaceVisibility: 'hidden',
          }}
        />

        {/* Bottom face */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-200 rounded-2xl"
          style={{
            transform: 'rotateX(-90deg) translateZ(20px)',
            transformOrigin: 'top',
            backfaceVisibility: 'hidden',
          }}
        />

        {/* Back face */}
        <div
          className="absolute inset-0 bg-gradient-to-tl from-gray-900 to-black dark:from-gray-100 dark:to-white rounded-2xl"
          style={{
            transform: 'rotateY(180deg) translateZ(20px)',
            backfaceVisibility: 'hidden',
          }}
        />

        {/* Subtle ambient glow - MetaLab style */}
        <motion.div
          className="absolute -inset-4 rounded-3xl opacity-20 blur-xl"
          animate={{
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.3), transparent)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}
