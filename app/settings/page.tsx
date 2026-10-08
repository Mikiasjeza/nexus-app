'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { authApi, billingApi } from '@/lib/api'
import ToggleSwitch from '@/components/UI/ToggleSwitch'
import { motion } from 'framer-motion'
import { Save, User as UserIcon, Mail, Globe, Lock, Shield, Download } from 'lucide-react'
import Link from 'next/link'
import CookiePreferencesButton from '@/components/UI/CookiePreferencesButton'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import AppPageShell from '@/components/Layout/AppPageShell'

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
        const sub = await billingApi.getSubscription().catch(() => null)
        setSubscription(sub)
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
      addToast({ type: 'success', title: 'GitHub connected', message: 'You can now sign in with GitHub.' })
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white/60">Please log in to view settings</p>
      </div>
    )
  }

  return (
    <AppPageShell className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="hero-panel p-8 md:p-10">
            <div className="hero-kicker mb-5">Identity Controls</div>
            <h1 className="mb-4 text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
              Settings
            </h1>
            <p className="text-lg text-white/68 max-w-2xl">
              Shape how your profile appears, how employers discover you, and how your Nexus identity behaves.
            </p>
          </div>
        </motion.div>

        <div className="space-y-8">
          {isGuestPreview && (
            <div className="border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-white">
              You are viewing Settings in guest preview mode. Actions that change account data are disabled.
            </div>
          )}
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.1, ease: easing.primary }}
          >
            <div className="gradient-border-card p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <UserIcon className="h-5 w-5 text-cyan-200/90" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Profile</h2>
                  <p className="mt-1 text-sm text-white/55">Name, email, and bio</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="metalab-label" htmlFor="settings-name">
                    Name
                  </label>
                  <input
                    id="settings-name"
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    className="metalab-input"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="metalab-label" htmlFor="settings-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/38" />
                    <input
                      id="settings-email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="metalab-input cursor-not-allowed pl-11 opacity-70"
                    />
                  </div>
                  <p className="mt-2 text-xs text-white/45">Email cannot be changed</p>
                </div>
                <div>
                  <label className="metalab-label" htmlFor="settings-bio">
                    Bio
                  </label>
                  <textarea
                    id="settings-bio"
                    value={formData.bio}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="metalab-input resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Privacy Settings */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.2, ease: easing.primary }}
          >
            <div className="gradient-border-card p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <Globe className="h-5 w-5 text-cyan-200/90" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Privacy</h2>
                  <p className="mt-1 text-sm text-white/55">Control how you appear to others</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-black/25 p-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-medium text-white">Public profile</h3>
                    <p className="text-sm leading-relaxed text-white/55">
                      Allow others to view your Nexus profile via shareable link
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.publicProfile}
                    onChange={(checked: boolean) => {
                      setFormData({ ...formData, publicProfile: checked })
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-black/25 p-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-medium text-white">Discoverable by employers</h3>
                    <p className="text-sm leading-relaxed text-white/55">
                      Let employer search include your profile when skills match. Requires Public Profile. Employers
                      see your name, bio, avatar and public skills, never your email. Turning this off removes you
                      from their results and shortlists.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.discoverableByEmployers}
                    onChange={(checked: boolean) => {
                      setFormData({ ...formData, discoverableByEmployers: checked })
                    }}
                  />
                </div>
                {formData.publicProfile && user?.shareableId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl border border-white/[0.08] bg-black/25 p-5"
                  >
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Shareable link</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${user.shareableId}`}
                        readOnly
                        className="metalab-input flex-1 font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${user.shareableId}`
                          navigator.clipboard.writeText(link)
                          addToast({
                            type: 'success',
                            title: 'Link Copied',
                            message: 'Shareable link copied to clipboard!',
                          })
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Security */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.3, ease: easing.primary }}
          >
            <div className="gradient-border-card p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <Lock className="h-5 w-5 text-violet-200/90" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Security</h2>
                  <p className="mt-1 text-sm text-white/55">Credentials and account actions</p>
                </div>
              </div>
              <div className="space-y-3">
                <Link href="/auth/forgot-password" className={isGuestPreview ? 'pointer-events-none block' : 'block'}>
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<Lock className="w-4 h-4" />}
                    disabled={isGuestPreview}
                  >
                    Change Password
                  </Button>
                </Link>
                {/* Full navigation (not <Link>): the OAuth flow leaves the app. */}
                <a href="/api/auth/github/authorize" className={isGuestPreview ? 'pointer-events-none block' : 'block'}>
                  <Button variant="outline" fullWidth disabled={isGuestPreview}>
                    Connect GitHub
                  </Button>
                </a>
                <p className="text-xs text-white/45">
                  Lets you sign in with GitHub. We only read your public profile and verified email.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Privacy & data */}
          <div id="privacy" className="gradient-border-card scroll-mt-24 p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                <Shield className="h-5 w-5 text-cyan-200/90" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">Privacy &amp; data</h2>
                <p className="mt-1 text-sm text-white/55">
                  Your data, your call. See our{' '}
                  <Link href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-white">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-black/25 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="mb-1 font-medium text-white">Download my data</h3>
                  <p className="text-sm text-white/55">
                    A JSON copy of your account, skills, evidence, AI results, activity and company memberships.
                  </p>
                </div>
                <Button
                  variant="outline"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleExport}
                  isLoading={exporting}
                  disabled={exporting || isGuestPreview}
                >
                  Download
                </Button>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-black/25 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="mb-1 font-medium text-white">Cookie settings</h3>
                  <p className="text-sm text-white/55">Essential cookies only, unless you turn on diagnostics.</p>
                </div>
                <CookiePreferencesButton className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/5">
                  Manage cookies
                </CookiePreferencesButton>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-black/25 p-5">
                <h3 className="mb-1 font-medium text-white">Delete account</h3>
                <p className="mb-4 text-sm text-white/55">
                  Permanently deletes your account, skills, evidence files and history, removes you from employer
                  shortlists, and cancels any active subscription. Companies where you are the only member are deleted
                  too. This can&apos;t be undone, so consider downloading your data first.
                </p>
                {deleteOpen ? (
                  <div className="space-y-3">
                    <label htmlFor="delete-confirm" className="block text-sm text-white">
                      Type <span className="font-mono font-semibold">DELETE</span> to confirm
                    </label>
                    <input
                      id="delete-confirm"
                      type="text"
                      autoComplete="off"
                      value={deleteConfirm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirm(e.target.value)}
                      className="metalab-input"
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                        isLoading={deleting}
                        disabled={deleteConfirm !== 'DELETE' || deleting}
                      >
                        Permanently delete
                      </Button>
                      <Button
                        variant="outline"
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
                  <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={isGuestPreview}>
                    Delete account
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Billing */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.35, ease: easing.primary }}
          >
            <div className="gradient-border-card p-8">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Billing</h2>
                  <p className="mt-1 text-sm text-white/55">
                    Plan · {subscription?.plan ?? 'free'} · {subscription?.status ?? 'active'}
                  </p>
                  {subscription?.currentPeriodEnd && (
                    <p className="mt-2 text-xs text-white/45">
                      {subscription.cancelAtPeriodEnd ? 'Access ends' : 'Renews'}{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-white/45">
                    Change plan, update payment details or cancel any time under Manage Billing.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={openBillingPortal}
                  isLoading={billingLoading}
                  disabled={billingLoading || isGuestPreview}
                >
                  Manage Billing
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.4, ease: easing.primary }}
            className="flex justify-end pt-4"
          >
            <Button
              leftIcon={<Save className="w-5 h-5" />}
              onClick={handleSave}
              disabled={saving || isGuestPreview}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </motion.div>
        </div>
      </div>
    </AppPageShell>
  )
}
