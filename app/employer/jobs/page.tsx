'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { Plus } from 'lucide-react'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import { useToast } from '@/components/UI/ToastProvider'
import { getSkillPillarDetail, inferSkillCategory } from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

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

const EMPTY_FORM: JobFormData = {
  title: '',
  description: '',
  skills: '',
  location: '',
  type: 'full-time',
  salary: '',
}

function pillarsFor(skills: string[]): string[] {
  return Array.from(
    new Set(skills.map((skill) => getSkillPillarDetail(inferSkillCategory(skill)).shortLabel))
  )
}

/** The company's roles: post one, see which pillars it leans on, close it when filled. */
export default function EmployerJobsPage() {
  const { addToast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<JobFormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const skillList = formData.skills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)
  const pillarPreview = pillarsFor(skillList.slice(0, 8))

  const loadJobs = async () => {
    try {
      const companyRes = await fetch('/api/employer/company', { credentials: 'include' })
      const companyData = await companyRes.json()
      if (!companyData.company) {
        setJobs([])
        return
      }
      const jobsRes = await fetch(`/api/jobs?companyId=${companyData.company.id}`, {
        credentials: 'include',
      })
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
        body: JSON.stringify({ ...formData, skills: skillList }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post the role')
      setJobs((prev) => [data, ...prev])
      setShowForm(false)
      setFormData(EMPTY_FORM)
      addToast({ type: 'success', title: 'Role posted' })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not post',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'closed' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to close the role')
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'closed' } : j)))
      addToast({ type: 'success', title: 'Role closed' })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not close',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Roles"
          rule
          description="Post roles with the skills they need. Nexus works out which pillars each role leans on and ranks candidates against it."
          actions={
            <Button
              variant={showForm ? 'secondary' : 'primary'}
              onClick={() => setShowForm(!showForm)}
              leftIcon={showForm ? undefined : <Plus className="size-4" aria-hidden />}
            >
              {showForm ? 'Cancel' : 'Post a role'}
            </Button>
          }
        />

        {showForm && (
          <form
            onSubmit={handleSubmit}
            aria-labelledby="new-role-heading"
            className="grid gap-6 border-t border-line py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10"
          >
            <div>
              <h2 id="new-role-heading" className="text-base font-medium">
                New role
              </h2>
              <p className="mt-1 max-w-[22rem] text-sm text-ink-muted">
                List skills the way you’d say them. Pillars are worked out for you.
              </p>
            </div>
            <div className="max-w-[44rem] space-y-5">
              <div>
                <label htmlFor="job-title" className="metalab-label">
                  Title
                </label>
                <input
                  id="job-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="metalab-input"
                />
              </div>
              <div>
                <label htmlFor="job-description" className="metalab-label">
                  Description
                </label>
                <textarea
                  id="job-description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="metalab-input resize-none"
                />
              </div>
              <div>
                <label htmlFor="job-skills" className="metalab-label">
                  Skills, separated by commas
                </label>
                <input
                  id="job-skills"
                  type="text"
                  placeholder="React, TypeScript, storytelling, leadership"
                  value={formData.skills}
                  onChange={(e) => setFormData((p) => ({ ...p, skills: e.target.value }))}
                  className="metalab-input"
                  aria-describedby="job-pillars"
                />
                <p id="job-pillars" className="mt-2 text-sm text-ink-faint">
                  {pillarPreview.length > 0
                    ? `Leans on ${pillarPreview.join(', ')}`
                    : 'Pillars appear here as you type.'}
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="job-location" className="metalab-label">
                    Location
                  </label>
                  <input
                    id="job-location"
                    type="text"
                    placeholder="Remote"
                    value={formData.location}
                    onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                    className="metalab-input"
                  />
                </div>
                <div>
                  <label htmlFor="job-type" className="metalab-label">
                    Type
                  </label>
                  <select
                    id="job-type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, type: e.target.value as JobType }))
                    }
                    className="metalab-input"
                  >
                    <option value="full-time">Full time</option>
                    <option value="part-time">Part time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="job-salary" className="metalab-label">
                    Salary range
                  </label>
                  <input
                    id="job-salary"
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData((p) => ({ ...p, salary: e.target.value }))}
                    className="metalab-input"
                  />
                </div>
              </div>
              <Button type="submit" disabled={submitting} isLoading={submitting}>
                Post role
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <Loader />
        ) : jobs.length === 0 ? (
          <div className="border-y border-line py-12">
            <p className="font-display text-3xl font-light">No roles yet</p>
            <p className="mt-3 max-w-md text-ink-muted">
              Post one and it appears on the marketplace, where the AI ranks candidates against it.
            </p>
          </div>
        ) : (
          <ul className="ruled-list border-y border-line">
            {jobs.map((job) => (
              <li
                key={job.id}
                className={`grid gap-4 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center ${
                  job.status === 'closed' ? 'opacity-50' : ''
                }`}
              >
                <div>
                  <h2 className="font-display text-[clamp(1.75rem,2.6vw,2.25rem)] font-light leading-tight">
                    {job.title}
                  </h2>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                    {job.location && <span>{job.location}</span>}
                    <span>{job.type.replace('-', ' ')}</span>
                    {job.salary && <span>{job.salary}</span>}
                    <span className="text-ink-faint">
                      {job.status === 'closed' ? 'Closed' : 'Posted'}{' '}
                      {formatDistanceToNowStrict(new Date(job.createdAt), { addSuffix: true })}
                    </span>
                  </p>
                </div>
                <div className="text-sm">
                  <p className="text-ink-muted">{job.skills.join(', ') || 'No skills listed'}</p>
                  {job.skills.length > 0 && (
                    <p className="mt-1 text-ink-faint">
                      Leans on {pillarsFor(job.skills).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 lg:justify-end">
                  {job.status === 'active' && (
                    <>
                      <Link
                        href={`/employer/talent?jobId=${job.id}`}
                        className="button-base button-primary min-h-9 px-4 text-sm"
                      >
                        Find matches
                      </Link>
                      <button type="button" className="pill" onClick={() => handleClose(job.id)}>
                        Close
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPageShell>
  )
}
