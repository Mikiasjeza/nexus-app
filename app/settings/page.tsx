'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { authApi, billingApi } from '@/lib/api'
import ToggleSwitch from '@/components/UI/ToggleSwitch'
import { Save, Download } from 'lucide-react'
import Link from 'next/link'
import CookiePreferencesButton from '@/components/UI/CookiePreferencesButton'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

export default function SettingsPage() {
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [subscription, setSubscription] = useState<{
    plan: 'free' | 'pro' | 'enterprise'
    status: 'active' | 'trialing' | 'past_due' | 'canceled'
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    publicProfile: false,
    discoverableByEmployers: false,
  })
  const isGuestPreview = user?.id === 'guest-user'

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authApi.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          setFormData({
            name: currentUser.name,
            email: currentUser.email,
            bio: currentUser.bio || '',
            publicProfile: currentUser.publicProfile,
            discoverableByEmployers: currentUser.discoverableByEmployers ?? false,
          })
        }
        // Guests have no billing; asking returns 401, which would bounce them to sign-in.
        if (currentUser && currentUser.id !== 'guest-user') {
          setSubscription(await billingApi.getSubscription().catch(() => null))
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('github')
    if (!result) return
    if (result === 'connected') {
      addToast({
        type: 'success',
        title: 'GitHub connected',
        message: 'You can now sign in with GitHub.',
      })
    } else if (result === 'already_linked') {
      addToast({
        type: 'error',
        title: 'GitHub not connected',
        message: 'That GitHub account is already linked to a different Nexus account.',
      })
    }
    window.history.replaceState(null, '', window.location.pathname)
  }, [addToast])

  const handleSave = async () => {
    if (!user) return
    if (isGuestPreview) {
      addToast({
        type: 'info',
        title: 'Guest preview mode',
        message: 'Profile changes are disabled in guest preview mode.',
      })
      return
    }
    setSaving(true)
    try {
      const updated = await authApi.updateProfile(formData)
      setUser(updated)
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been saved successfully.',
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await authApi.exportData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexus-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Export failed',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      await authApi.deleteAccount()
      addToast({
        type: 'success',
        title: 'Account deleted',
        message: 'Your account and data have been permanently deleted.',
      })
      window.location.assign('/')
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Deletion failed',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
      setDeleting(false)
    }
  }

  const openBillingPortal = async () => {
    if (isGuestPreview) {
      addToast({
        type: 'info',
        title: 'Guest preview mode',
        message: 'Billing is disabled in guest preview mode.',
      })
      return
    }
    setBillingLoading(true)
    try {
      const { url } = await billingApi.createPortalSession()
      window.location.href = url
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Billing portal unavailable',
        message: error instanceof Error ? error.message : 'Please try again later.',
      })
    } finally {
      setBillingLoading(false)
    }
  }

  if (loading) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
    )
  }

  if (!user) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <PageHeader
            title="Settings"
            rule
            description="Sign in to change your profile, visibility and account."
            actions={
              <Link
                href="/auth/login?next=/settings"
                className="button-base button-primary min-h-11 px-5"
              >
                Sign in
              </Link>
            }
          />
        </div>
      </AppPageShell>
    )
  }

  const shareLink = user?.shareableId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${user.shareableId}`
    : ''

  return (
    <AppPageShell>
      <div className="page-shell">
        {isGuestPreview && (
          <div className="mb-4 border-b border-line pb-4 text-sm text-ink-muted">
            You are viewing Settings as a guest. Changes to account data are turned off.
          </div>
        )}

        <PageHeader
          title="Settings"
          rule
          description="How your profile looks, who can find you, and your account and data."
          actions={
            <Button
              leftIcon={<Save className="size-4" aria-hidden />}
              onClick={handleSave}
              disabled={saving || isGuestPreview}
              isLoading={saving}
            >
              Save changes
            </Button>
          }
        />

        <div className="border-t border-line">
          <SettingsSection title="Profile" description="Your name and a short bio.">
            <div className="space-y-6">
              <div>
                <label className="metalab-label" htmlFor="settings-name">
                  Name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="metalab-input"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="metalab-label" htmlFor="settings-email">
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={formData.email}
                  disabled
                  aria-describedby="settings-email-note"
                  className="metalab-input"
                />
                <p id="settings-email-note" className="mt-2 text-sm text-ink-faint">
                  Email can’t be changed.
                </p>
              </div>
              <div>
                <label className="metalab-label" htmlFor="settings-bio">
                  Bio
                </label>
                <textarea
                  id="settings-bio"
                  value={formData.bio}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={4}
                  className="metalab-input resize-none"
                  placeholder="A line or two about what you do"
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Visibility" description="Who can see your passport.">
            <ul className="ruled-list border-y border-line">
              <li className="flex items-start justify-between gap-6 py-5">
                <div>
                  <p className="font-medium">Public profile</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    Anyone with your link can view your passport.
                  </p>
                </div>
                <ToggleSwitch
                  checked={formData.publicProfile}
                  onChange={(checked: boolean) =>
                    setFormData({ ...formData, publicProfile: checked })
                  }
                />
              </li>
              <li className="flex items-start justify-between gap-6 py-5">
                <div>
                  <p className="font-medium">Discoverable by employers</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    Employer search can include you when your skills match. Needs a public profile.
                    Employers see your name, bio, avatar and public skills, never your email.
                    Turning this off removes you from their results and shortlists.
                  </p>
                </div>
                <ToggleSwitch
                  checked={formData.discoverableByEmployers}
                  onChange={(checked: boolean) =>
                    setFormData({ ...formData, discoverableByEmployers: checked })
                  }
                />
              </li>
              {formData.publicProfile && shareLink && (
                <li className="py-5">
                  <label htmlFor="settings-share-link" className="font-medium">
                    Your link
                  </label>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      id="settings-share-link"
                      type="text"
                      value={shareLink}
                      readOnly
                      className="metalab-input flex-1 text-sm"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink)
                        addToast({
                          type: 'success',
                          title: 'Link copied',
                          message: 'Your passport link is on the clipboard.',
                        })
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </li>
              )}
            </ul>
          </SettingsSection>

          <SettingsSection title="Sign-in" description="Your password and connected accounts.">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/auth/forgot-password"
                aria-disabled={isGuestPreview || undefined}
                className={`button-base button-secondary min-h-11 px-5 ${isGuestPreview ? 'pointer-events-none opacity-40' : ''}`}
              >
                Change password
              </Link>
              {/* Full navigation (not <Link>): the OAuth flow leaves the app. */}
              <a
                href="/api/auth/github/authorize"
                aria-disabled={isGuestPreview || undefined}
                className={`button-base button-secondary min-h-11 px-5 ${isGuestPreview ? 'pointer-events-none opacity-40' : ''}`}
              >
                Connect GitHub
              </a>
            </div>
            <p className="mt-3 text-sm text-ink-faint">
              GitHub sign-in reads only your public profile and verified email.
            </p>
          </SettingsSection>

          <SettingsSection
            id="privacy"
            title="Privacy & data"
            description={
              <>
                Your data, your call. See the{' '}
                <Link
                  href="/privacy"
                  className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                >
                  Privacy Policy
                </Link>
                .
              </>
            }
          >
            <ul className="ruled-list border-y border-line">
              <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Download my data</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    A JSON copy of your account, skills, evidence, AI results, activity and company
                    memberships.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  leftIcon={<Download className="size-4" aria-hidden />}
                  onClick={handleExport}
                  isLoading={exporting}
                  disabled={exporting || isGuestPreview}
                >
                  Download
                </Button>
              </li>
              <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Cookies</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Essential cookies only, unless you turn on diagnostics.
                  </p>
                </div>
                <CookiePreferencesButton className="button-base button-secondary min-h-11 px-5">
                  Cookie settings
                </CookiePreferencesButton>
              </li>
              <li className="py-5">
                <p className="font-medium text-critical">Delete account</p>
                <p className="mt-1 max-w-[40rem] text-sm leading-relaxed text-ink-muted">
                  Permanently deletes your account, skills, evidence files and history, removes you
                  from employer shortlists, and cancels any active subscription. Companies where you
                  are the only member are deleted too. This can’t be undone, so download your data
                  first if you want a copy.
                </p>
                {deleteOpen ? (
                  <div className="mt-4 max-w-sm space-y-3">
                    <label htmlFor="delete-confirm" className="block text-sm">
                      Type <span className="font-medium">DELETE</span> to confirm
                    </label>
                    <input
                      id="delete-confirm"
                      type="text"
                      autoComplete="off"
                      value={deleteConfirm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDeleteConfirm(e.target.value)
                      }
                      className="metalab-input"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                        isLoading={deleting}
                        disabled={deleteConfirm !== 'DELETE' || deleting}
                      >
                        Permanently delete
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDeleteOpen(false)
                          setDeleteConfirm('')
                        }}
                        disabled={deleting}
                      >
                        Keep my account
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="mt-4"
                    variant="danger"
                    onClick={() => setDeleteOpen(true)}
                    disabled={isGuestPreview}
                  >
                    Delete account
                  </Button>
                )}
              </li>
            </ul>
          </SettingsSection>

          <SettingsSection title="Billing" description="Your plan and payment details.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium capitalize">
                  {subscription?.plan ?? 'free'}{' '}
                  <span className="font-normal text-ink-faint">
                    · {subscription?.status ?? 'active'}
                  </span>
                </p>
                {subscription?.currentPeriodEnd && (
                  <p className="mt-1 text-sm text-ink-muted">
                    {subscription.cancelAtPeriodEnd ? 'Access ends' : 'Renews'}{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
                <p className="mt-1 text-sm text-ink-faint">
                  Change plan, update payment details or cancel any time.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={openBillingPortal}
                isLoading={billingLoading}
                disabled={billingLoading || isGuestPreview}
              >
                Manage billing
              </Button>
            </div>
          </SettingsSection>
        </div>
      </div>
    </AppPageShell>
  )
}

/** One settings group: its name and purpose on the left, controls on the right. */
function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id?: string
  title: string
  description: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${title.replace(/\W+/g, '-').toLowerCase()}-heading`}
      className="grid scroll-mt-28 gap-6 border-b border-line py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10"
    >
      <div>
        <h2
          id={`${title.replace(/\W+/g, '-').toLowerCase()}-heading`}
          className="text-base font-medium"
        >
          {title}
        </h2>
        <p className="mt-1 max-w-[22rem] text-sm text-ink-muted">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  )
}
