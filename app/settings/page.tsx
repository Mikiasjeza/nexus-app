'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { authApi, billingApi } from '@/lib/api'
import ToggleSwitch from '@/components/UI/ToggleSwitch'
import { motion } from 'framer-motion'
import { Save, User as UserIcon, Mail, Globe, Lock } from 'lucide-react'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'

export default function SettingsPage() {
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
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
    <div className="aurora-shell min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="hero-panel p-8 md:p-10">
            <div className="hero-kicker mb-5">Identity Controls</div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight leading-[1.1]">
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
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 border border-white/10 bg-white/5">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Profile Information</h2>
                  <p className="text-sm text-white/60 mt-1">Update your personal details</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full pl-12 pr-5 py-3 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-black/60 dark:text-white/60 mt-2">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-5 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
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
            <div className="border border-black/10 dark:border-white/10 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 border border-black/10 dark:border-white/10">
                  <Globe className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">Privacy Settings</h2>
                  <p className="text-sm text-black/60 dark:text-white/60 mt-1">Control your profile visibility</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-5 border border-black/10 dark:border-white/10">
                  <div className="flex-1">
                    <h3 className="font-medium text-black dark:text-white mb-2">Public Profile</h3>
                    <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
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
                <div className="flex items-center justify-between p-5 border border-black/10 dark:border-white/10">
                  <div className="flex-1">
                    <h3 className="font-medium text-black dark:text-white mb-2">
                      Discoverable by Employers
                    </h3>
                    <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                      Allow employers to find you when searching for talent by skills
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
                    className="p-5 border border-black/10 dark:border-white/10"
                  >
                    <p className="text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">Your Shareable Link</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${user.shareableId}`}
                        readOnly
                        className="flex-1 px-4 py-2.5 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white text-sm font-mono"
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
            <div className="border border-black/10 dark:border-white/10 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 border border-black/10 dark:border-white/10">
                  <Lock className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">Security</h2>
                  <p className="text-sm text-black/60 dark:text-white/60 mt-1">Manage account security</p>
                </div>
              </div>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<Lock className="w-4 h-4" />}
                  disabled={isGuestPreview}
                >
                  Change Password
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  disabled={isGuestPreview}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Billing */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.35, ease: easing.primary }}
          >
            <div className="border border-black/10 dark:border-white/10 p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">Billing</h2>
                  <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                    Plan: {subscription?.plan ?? 'free'} · Status: {subscription?.status ?? 'active'}
                  </p>
                  {subscription?.currentPeriodEnd && (
                    <p className="text-xs text-black/60 dark:text-white/60 mt-2">
                      Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
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
    </div>
  )
}
