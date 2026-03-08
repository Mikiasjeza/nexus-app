'use client'

import React, { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User, Skill } from '@/lib/types'
import { motion } from 'framer-motion'
import { Globe, User as UserIcon, Share2, Download, CheckCircle2, TrendingUp } from 'lucide-react'
import Loader from '@/components/UI/Loader'
import { LEVEL_COLORS, LEVEL_LABELS } from '@/lib/utils/constants'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { easing } from '@/lib/utils/animations'

// MetaLab scroll animation pattern
const metalabScroll = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: easing.primary },
}

export default function SharePage() {
  const params = useParams()
  const shareableId = params.id as string
  const [user, setUser] = useState<User | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(shareableId)}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        setUser(data.user)
        setSkills(data.skills ?? [])
      } catch (error) {
        console.error('Failed to load profile:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (shareableId) {
      loadData()
    }
  }, [shareableId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <Loader />
      </div>
    )
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: easing.gentle }}
          className="text-center"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4 tracking-tight">
            Profile Not Found
          </h1>
          <p className="text-lg text-black/60 dark:text-white/60 max-w-md mx-auto leading-relaxed">
            This profile is private or doesn&apos;t exist.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        {/* Editorial Header - Slower, more deliberate pacing */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: 0.1, ease: easing.primary }}
          className="text-center mb-16 lg:mb-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: easing.gentle }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-black/10 dark:border-white/10 mb-8"
          >
            <Globe className="w-4 h-4 text-black dark:text-white" />
            <span className="text-sm font-medium text-black dark:text-white uppercase tracking-wider">
              Public Nexus Profile
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.2, ease: easing.primary }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white mb-6 tracking-tight leading-[1.1]"
          >
            {user.name}
          </motion.h1>
          
          {user.bio && (
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8, delay: 0.3, ease: easing.primary }}
              className="text-lg text-black/60 dark:text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              {user.bio}
            </motion.p>
          )}
          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.4, ease: easing.primary }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Share2 className="w-4 h-4" />}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
              }}
            >
              Share Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => {
                // Export functionality
              }}
            >
              Export PDF
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Cards - Editorial spacing and pacing */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 1, delay: 0.2, ease: easing.gentle }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        >
          {[
            {
              icon: UserIcon,
              label: 'Total Skills',
              value: skills.length.toString(),
            },
            {
              icon: CheckCircle2,
              label: 'Verified Skills',
              value: skills.filter(s => s.verified).length.toString(),
            },
            {
              icon: TrendingUp,
              label: 'Average Progress',
              value: skills.length > 0
                ? Math.round(skills.reduce((sum, s) => sum + s.progress, 0) / skills.length).toString()
                : '0',
              suffix: '%',
            },
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 1,
                  delay: 0.4 + index * 0.15,
                  ease: easing.gentle,
                }}
                className="border border-black/10 dark:border-white/10 p-8 text-center"
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="p-3 border border-black/10 dark:border-white/10">
                    <Icon className="w-6 h-6 text-black dark:text-white" />
                  </div>
                </div>
                <h3 className="text-xs uppercase tracking-wider font-medium text-black/60 dark:text-white/60 mb-4">
                  {stat.label}
                </h3>
                <p className="text-4xl lg:text-5xl font-bold text-black dark:text-white tracking-tight tabular-nums">
                  {stat.value}{stat.suffix || ''}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Skills Portfolio - Editorial presentation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 1.2, ease: easing.gentle }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1, delay: 0.2, ease: easing.gentle }}
            className="text-3xl lg:text-4xl font-bold text-black dark:text-white mb-12 lg:mb-16 tracking-tight"
          >
            Skills Portfolio
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {skills.map((skill, index) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.08,
                  ease: easing.gentle,
                }}
                className="border border-black/10 dark:border-white/10 p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-black dark:text-white mb-4 tracking-tight">
                      {skill.name}
                    </h3>
                    <div className="flex items-center gap-2.5 mb-6 flex-wrap">
                      <span
                        className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider"
                        style={{
                          color: LEVEL_COLORS[skill.level],
                        }}
                      >
                        {LEVEL_LABELS[skill.level]}
                      </span>
                      <span className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 rounded-full text-xs font-medium">
                        {skill.category}
                      </span>
                      {skill.verified && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.5 + index * 0.08 }}
                          className="p-1 border border-black/10 dark:border-white/10"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-black dark:text-white" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Progress bar - animates forward */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-black/60 dark:text-white/60 uppercase tracking-wider">
                      Progress
                    </span>
                    <span className="text-sm font-bold text-black dark:text-white tabular-nums">
                      {skill.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/10 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${skill.progress}%` }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{
                        duration: 1.5,
                        delay: 0.6 + index * 0.08,
                        ease: easing.gentle,
                      }}
                      style={{
                        backgroundColor: LEVEL_COLORS[skill.level],
                      }}
                    />
                  </div>
                </div>
                
                {skill.description && (
                  <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed line-clamp-2">
                    {skill.description}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
