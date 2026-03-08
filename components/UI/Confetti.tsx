'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ConfettiProps {
  trigger: boolean
  count?: number
  colors?: string[]
}

export default function Confetti({
  trigger,
  count = 100,
  colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'],
}: ConfettiProps) {
  const [confetti, setConfetti] = useState<Array<{
    id: number
    x: number
    y: number
    rotation: number
    scale: number
    color: string
    shape: 'circle' | 'square' | 'triangle'
  }>>([])

  useEffect(() => {
    if (trigger) {
      const newConfetti = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'triangle',
      }))
      setConfetti(newConfetti)
    }
  }, [trigger, count, colors])

  if (!trigger || confetti.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{
            x: `${piece.x}vw`,
            y: `${piece.y}vh`,
            rotate: piece.rotation,
            scale: piece.scale,
          }}
          animate={{
            y: '100vh',
            rotate: piece.rotation + 360,
            x: `${piece.x + (Math.random() * 20 - 10)}vw`,
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            ease: 'easeOut',
          }}
          className="absolute"
          style={{
            width: '10px',
            height: '10px',
          }}
        >
          {piece.shape === 'circle' && (
            <div
              className="w-full h-full rounded-full"
              style={{ backgroundColor: piece.color }}
            />
          )}
          {piece.shape === 'square' && (
            <div
              className="w-full h-full"
              style={{ backgroundColor: piece.color }}
            />
          )}
          {piece.shape === 'triangle' && (
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: `10px solid ${piece.color}`,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}
