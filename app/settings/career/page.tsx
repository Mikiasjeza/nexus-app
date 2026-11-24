'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import {
  CertificationEditor,
  EducationEditor,
  ExperienceEditor,
} from '@/components/Career/RecordEditors'
import {
  BasicsEditor,
  InterestsEditor,
  PreferencesEditor,
} from '@/components/Career/ProfileEditors'
import {
  EMPTY_PROFILE,
  useCareerProfile,
  type ProfileFields,
} from '@/components/Career/useCareerProfile'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="mb-6 text-base font-medium">{title}</h2>
      {children}
    </section>
  )
}

/** Career Settings: edit or delete education, experience, interests and job preferences. */
export default function CareerSettingsPage() {
  const { addToast } = useToast()
  const career = useCareerProfile()
  const [profile, setProfile] = useState<ProfileFields>(EMPTY_PROFILE)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (career.data?.profile && !dirty) setProfile({ ...EMPTY_PROFILE, ...career.data.profile })
  }, [career.data, dirty])

  const patch = (p: Partial<ProfileFields>) => {
    setProfile((cur) => ({ ...cur, ...p }))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const fields: Partial<ProfileFields> = { ...profile }
      delete fields.onboardingStep
      await career.saveProfile(fields)
      setDirty(false)
      addToast({ type: 'success', title: 'Career preferences saved' })
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Not saved',
        message: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const records = (kind: string) => ({
    onAdd: (b: unknown) => career.addRecord(kind, b),
    onUpdate: (id: string, b: unknown) => career.updateRecord(kind, id, b),
    onDelete: (id: string) => career.deleteRecord(kind, id),
  })

  return (
    <AppPageShell>
      <div className="page-shell max-w-[64rem]">
        <PageHeader
          title="Career settings"
          rule
          description="Your education, experience, interests and job preferences. Private: never shown to employers or the public unless you choose to share."
          actions={
            <Link href="/settings" className="button-base button-secondary min-h-11 px-5">
              All settings
            </Link>
          }
        />
        {!career.data ? (
          career.error ? (
            <p className="text-critical">{career.error}</p>
          ) : (
            <Loader />
          )
        ) : (
          <>
            <Section title="Education">
              <EducationEditor rows={career.data.education} {...records('education')} />
            </Section>
            <Section title="Certifications and licenses">
              <CertificationEditor
                rows={career.data.certifications}
                {...records('certifications')}
              />
            </Section>
            <Section title="Experience">
              <ExperienceEditor rows={career.data.experience} {...records('experience')} />
            </Section>
            <Section title="About you">
              <BasicsEditor value={profile} onChange={patch} />
            </Section>
            <Section title="Interests and goals">
              <InterestsEditor value={profile} onChange={patch} />
            </Section>
            <Section title="Job preferences">
              <PreferencesEditor value={profile} onChange={patch} />
            </Section>
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line bg-ground py-4">
              {dirty && <span className="text-sm text-ink-muted">Unsaved changes</span>}
              <Button onClick={save} isLoading={saving} disabled={!dirty}>
                Save preferences
              </Button>
            </div>
          </>
        )}
      </div>
    </AppPageShell>
  )
}
