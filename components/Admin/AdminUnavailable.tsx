import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

/**
 * Shown when an admin screen can't load. The server answers "Not found" to
 * everyone who isn't an admin, so this explains what an admin needs without
 * confirming to anyone else that the area exists for them.
 */
export default function AdminUnavailable({ message }: { message: string }) {
  // "Not found" for a signed-in non-admin; "Sign in …" when signed out or in the guest preview.
  const notAllowed = message === 'Not found' || message.startsWith('Sign in')
  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Not available"
          description={
            notAllowed ? (
              <>
                This area is for Nexus admins. If that&apos;s you, sign in with your admin email
                address. If it still doesn&apos;t open, confirm that address once: use{' '}
                <Link href="/auth/forgot-password" className="metalab-link">
                  Forgot password
                </Link>{' '}
                and open the link we email you.
              </>
            ) : (
              message
            )
          }
        />
      </div>
    </AppPageShell>
  )
}
