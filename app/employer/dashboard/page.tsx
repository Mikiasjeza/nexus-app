'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  Briefcase,
  Search,
  ArrowRight,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/UI/Button'
import AnimatedCard from '@/components/UI/AnimatedCard'
import { easing } from '@/lib/utils/animations'

interface Company {
  id: string
  name: string
  slug: string
  role: string
  jobCount: number
  poolCount: number
}

export default function EmployerDashboardPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/employer/company', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.company) setCompany(data.company)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-black/40 dark:text-white/40">
          Loading...
        </div>
      </div>
    )
  }

  const actions = [
    {
      title: 'Search Talent',
      description: 'Find candidates by verified skills',
      icon: Search,
      href: '/employer/talent',
      primary: true,
    },
    {
      title: 'Talent Pools',
      description: 'Manage your saved candidates',
      icon: Users,
      href: '/employer/pools',
      count: company.poolCount,
    },
    {
      title: 'Job Listings',
      description: 'Post and manage open roles',
      icon: Briefcase,
      href: '/employer/jobs',
      count: company.jobCount,
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-black py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white">
                {company.name}
              </h1>
              <p className="text-black/60 dark:text-white/60">
                Employer dashboard · {company.role}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {actions.map((action, index) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={action.href}>
                <AnimatedCard
                  className={`p-6 h-full flex flex-col ${
                    action.primary
                      ? 'border-primary-500/30 bg-primary-50/50 dark:bg-primary-900/10'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                      <action.icon className="w-6 h-6 text-black dark:text-white" />
                    </div>
                    {action.count !== undefined && (
                      <span className="text-2xl font-bold text-black dark:text-white">
                        {action.count}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                    {action.title}
                  </h3>
                  <p className="text-black/60 dark:text-white/60 mb-4 flex-1">
                    {action.description}
                  </p>
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium">
                    <span>Open</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </AnimatedCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
