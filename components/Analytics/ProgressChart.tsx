'use client'

import { Skill } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo, useState, useRef } from 'react'
import { format, subDays } from 'date-fns'
import { motion } from 'framer-motion'
import { useCursorReactive } from '@/lib/hooks/useCursorReactive'

interface ProgressChartProps {
  skills: Skill[]
  days?: number
}

export default function ProgressChart({ skills, days = 30 }: ProgressChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const cursor = useCursorReactive()
  const chartRef = useRef<HTMLDivElement>(null)

  const data = useMemo(() => {
    // Generate mock historical data for the last N days
    const dates = Array.from({ length: days }, (_, i) => subDays(new Date(), days - i - 1))
    
    return dates.map((date) => {
      const totalProgress = skills.reduce((sum, skill) => {
        // Simulate progress over time (in real app, this would come from historical data)
        const daysSinceCreation = Math.floor(
          (date.getTime() - new Date(skill.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceCreation < 0) return sum
        const progress = Math.min(100, (daysSinceCreation / 30) * skill.progress)
        return sum + progress
      }, 0)
      
      return {
        date: format(date, 'MMM d'),
        average: Math.round(totalProgress / Math.max(1, skills.length)),
      }
    })
  }, [skills, days])

  // Calculate if cursor is near chart for reactive effects
  const isCursorNear = useMemo(() => {
    if (!chartRef.current) return false
    const rect = chartRef.current.getBoundingClientRect()
    const distanceX = Math.abs(cursor.x - (rect.left + rect.width / 2))
    const distanceY = Math.abs(cursor.y - (rect.top + rect.height / 2))
    return distanceX < rect.width / 2 && distanceY < rect.height / 2
  }, [cursor, chartRef])

  return (
    <motion.div
      ref={chartRef}
      initial={{ opacity: 0, y: 30, scale: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      animate={{
        scale: isCursorNear ? 1.01 : 1,
      }}
      transition={{ 
        opacity: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
        y: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
        scale: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
      }}
    >
      <div className="relative overflow-hidden border border-black/10 dark:border-white/10 p-6">
        {/* Gradient accent spine */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 via-indigo-500 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400 opacity-80"
          aria-hidden
        />
        <h2 className="text-xl font-bold text-black dark:text-white mb-6">Progress Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="progressLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="average"
              stroke="url(#progressLineGradient)"
              strokeWidth={2.5}
              dot={{ fill: 'url(#progressLineGradient)', r: 4 }}
              name="Average Progress"
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
