'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Plus,
  MapPin,
  DollarSign,
  Building2,
} from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'

interface Job {
  id: string
  title: string
  description?: string
  skills: string[]
  location?: string
  type: string
  salary?: string
  status: string
  company: { name: string; slug: string }
  createdAt: string
}

type JobType = 'full-time' | 'part-time' | 'contract' | 'internship'

interface JobFormData {
  title: string
  description: string
  skills: string
  location: string
  type: JobType
  salary: string
}

export default function EmployerJobsPage() {
  const { addToast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    skills: '',
    location: '',
    type: 'full-time',
    salary: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const loadJobs = async () => {
    try {
      const companyRes = await fetch('/api/employer/company', {
        credentials: 'include',
      })
      const companyData = await companyRes.json()

      if (!companyData.company) {
        setJobs([])
        return
      }

      const jobsRes = await fetch(
        `/api/jobs?companyId=${companyData.company.id}`,
        { credentials: 'include' }
      )
      const jobsData = await jobsRes.json()
      setJobs(jobsData.jobs || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          skills: formData.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setJobs((prev) => [data, ...prev])
      setShowForm(false)
      setFormData({
        title: '',
        description: '',
        skills: '',
        location: '',
        type: 'full-time',
        salary: '',
      })
      addToast({ type: 'success', title: 'Job posted' })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'closed' }),
      })
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status: 'closed' } : j))
      )
      addToast({ type: 'success', title: 'Job closed' })
    } catch {
      addToast({ type: 'error', title: 'Failed to close' })
    }
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
                Job Listings
              </h1>
              <p className="text-lg text-black/60 dark:text-white/60">
                Post roles and reach verified talent
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {showForm ? 'Cancel' : 'Post Job'}
            </Button>
          </div>

          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border border-black/10 dark:border-white/10 p-6 mb-8"
              onSubmit={handleSubmit}
            >
              <h3 className="text-xl font-semibold mb-4">New Job</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Job title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
                  rows={3}
                />
                <input
                  type="text"
                  placeholder="Skills (comma-separated: React, TypeScript)"
                  value={formData.skills}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, skills: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, location: e.target.value }))
                    }
                    className="px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
                  />
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        type: e.target.value as JobType,
                      }))
                    }
                    className="px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Salary range"
                    value={formData.salary}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, salary: e.target.value }))
                    }
                    className="px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white"
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  Post Job
                </Button>
              </div>
            </motion.form>
          )}
        </motion.div>

        {loading ? (
          <div className="text-black/40 dark:text-white/40">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="border border-black/10 dark:border-white/10 p-12 text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
            <h3 className="text-xl font-medium text-black dark:text-white mb-2">
              No jobs posted yet
            </h3>
            <p className="text-black/60 dark:text-white/60 mb-4">
              Post your first job to reach candidates on the marketplace
            </p>
            <Button onClick={() => setShowForm(true)}>Post Job</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border border-black/10 dark:border-white/10 p-6 ${
                  job.status === 'closed' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-black dark:text-white">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-black/60 dark:text-white/60 text-sm">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.company.name}
                      </span>
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
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="default" size="sm">
                        {job.type}
                      </Badge>
                      {job.skills.slice(0, 4).map((s) => (
                        <Badge key={s} variant="default" size="sm">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {job.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClose(job.id)}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
