'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Building2,
  Briefcase,
  MapPin,
  DollarSign,
  ExternalLink,
  Globe,
} from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { easing } from '@/lib/utils/animations'

interface Job {
  id: string
  title: string
  description?: string
  skills: string[]
  location?: string
  type: string
  salary?: string
}

interface Company {
  id: string
  name: string
  slug: string
  logo?: string
  website?: string
  description?: string
}

export default function CompanyPage() {
  const params = useParams()
  const slug = params.slug as string
  const [company, setCompany] = useState<Company | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    Promise.all([
      fetch(`/api/company/${slug}`, { credentials: 'include' }).then((r) =>
        r.json()
      ),
      fetch(`/api/jobs?companySlug=${slug}`, { credentials: 'include' }).then(
        (r) => r.json()
      ),
    ])
      .then(([companyData, jobsData]) => {
        if (companyData.company) setCompany(companyData.company)
        if (jobsData.jobs) setJobs(jobsData.jobs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-black/40 dark:text-white/40">
          Loading...
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
          <h2 className="text-xl font-medium text-black dark:text-white mb-2">
            Company not found
          </h2>
          <a href="/marketplace" className="text-primary-600 dark:text-primary-400">
            Browse jobs
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
              {company.logo ? (
                <Image
                  src={company.logo}
                  alt={`${company.name} logo`}
                  width={80}
                  height={80}
                  unoptimized
                  className="w-20 h-20 rounded-2xl object-cover"
                />
              ) : (
                <Building2 className="w-10 h-10 text-black/40 dark:text-white/40" />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
                {company.name}
              </h1>
              {company.description && (
                <p className="text-black/60 dark:text-white/60 max-w-2xl mb-4">
                  {company.description}
                </p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  {company.website}
                </a>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
            Open Roles
          </h2>
          {jobs.length === 0 ? (
            <div className="border border-black/10 dark:border-white/10 p-12 text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
              <p className="text-black/60 dark:text-white/60">
                No open positions at the moment
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-black/10 dark:border-white/10 p-6"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-black/60 dark:text-white/60 text-sm mb-3">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                        )}
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {job.salary}
                          </span>
                        )}
                        <Badge variant="default" size="sm">
                          {job.type}
                        </Badge>
                      </div>
                      {job.description && (
                        <p className="text-black/60 dark:text-white/60 text-sm mb-4 line-clamp-2">
                          {job.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {job.skills.slice(0, 6).map((s) => (
                          <Badge key={s} variant="default" size="sm">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <a href={`/marketplace?job=${job.id}`}>
                        <Button
                          variant="primary"
                          rightIcon={<ExternalLink className="w-4 h-4" />}
                        >
                          View & Apply
                        </Button>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
