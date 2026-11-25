'use client'

import { useCallback, useEffect, useState } from 'react'

export type EducationRow = {
  id: string
  institution: string | null
  level: string
  fieldOfStudy: string | null
  status: string
  startDate: string | null
  graduationDate: string | null
  verification: string
}
export type ExperienceRow = {
  id: string
  employer: string
  title: string
  industry: string | null
  employmentType: string
  startDate: string | null
  endDate: string | null
  current: boolean
  description: string | null
  verification: string
}
export type CertificationRow = {
  id: string
  name: string
  issuer: string | null
  kind: string
  issueDate: string | null
  expirationDate: string | null
  verification: string
}
export type ProfileFields = {
  employmentStatus: string | null
  currentlyStudent: boolean | null
  yearsExperience: number | null
  interests: string[]
  exploring: boolean
  desiredTitles: string[]
  longTermGoal: string | null
  targetCareer: string | null
  targetSkills: string[]
  progression: string | null
  locations: string[]
  workArrangements: string[]
  salaryMin: number | null
  salaryMax: number | null
  jobTypes: string[]
  experienceLevels: string[]
  willingToRelocate: boolean | null
  preferredIndustries: string[]
  availability: string | null
  onboardingStep: number
}
export type CareerData = {
  profile: ProfileFields | null
  education: EducationRow[]
  experience: ExperienceRow[]
  certifications: CertificationRow[]
  skills: { id: string; name: string; level: string; verified: boolean }[]
}

export const EMPTY_PROFILE: ProfileFields = {
  employmentStatus: null,
  currentlyStudent: null,
  yearsExperience: null,
  interests: [],
  exploring: false,
  desiredTitles: [],
  longTermGoal: null,
  targetCareer: null,
  targetSkills: [],
  progression: null,
  locations: [],
  workArrangements: [],
  salaryMin: null,
  salaryMax: null,
  jobTypes: [],
  experienceLevels: [],
  willingToRelocate: null,
  preferredIndustries: [],
  availability: null,
  onboardingStep: 0,
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong')
  return data
}

/** Loads the signed-in person's Career Profile and offers save helpers. */
export function useCareerProfile() {
  const [data, setData] = useState<CareerData | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      setData(await send('/api/career/profile', 'GET'))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile')
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const saveProfile = useCallback(async (patch: Partial<ProfileFields>) => {
    const { profile } = await send('/api/career/profile', 'PUT', patch)
    setData((d) => (d ? { ...d, profile } : d))
  }, [])

  const addRecord = useCallback(
    async (kind: string, body: unknown) => {
      await send(`/api/career/records/${kind}`, 'POST', body)
      await reload()
    },
    [reload]
  )
  const updateRecord = useCallback(
    async (kind: string, id: string, body: unknown) => {
      await send(`/api/career/records/${kind}/${id}`, 'PATCH', body)
      await reload()
    },
    [reload]
  )
  const deleteRecord = useCallback(
    async (kind: string, id: string) => {
      await send(`/api/career/records/${kind}/${id}`, 'DELETE')
      await reload()
    },
    [reload]
  )

  return { data, error, reload, saveProfile, addRecord, updateRecord, deleteRecord }
}

/** Date from the API ("2026-05-01T00:00:00.000Z") -> "2026-05" for month inputs. */
export const toMonth = (iso: string | null) => (iso ? iso.slice(0, 7) : '')

export const fmtMonth = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : ''
