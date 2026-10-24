import type { Metadata } from 'next'
import Link from 'next/link'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import { publicCredential, type PublicCredential } from '@/lib/assessments/verify'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

async function load(id: string): Promise<PublicCredential | null | 'error'> {
  try {
    return await publicCredential(decodeURIComponent(id))
  } catch (error) {
    console.error('Credential lookup failed:', error)
    return 'error'
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const credential = await load(id)
  if (!credential || credential === 'error')
    return { title: 'Credential check', robots: { index: false } }
  return {
    title: `${credential.holder.name}: ${credential.skillName} credential`,
    description: `${credential.skillName}, ${credential.level.toLowerCase()}. ${credential.modeLabel}. Score ${credential.score}. Status: ${credential.status.toLowerCase()}.`,
    robots: { index: false },
  }
}

const STATUS: Record<
  PublicCredential['status'],
  { label: string; className: string; note: string }
> = {
  ACTIVE: { label: 'Valid', className: 'bg-verified-wash text-verified-ink', note: '' },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-pill text-ink-muted',
    note: 'This credential has passed its end date. It was valid when issued.',
  },
  REVOKED: {
    label: 'Revoked',
    className: 'bg-critical/15 text-critical',
    note: 'Nexus withdrew this credential after a review. It should not be relied on.',
  },
  SUPERSEDED: {
    label: 'Replaced',
    className: 'bg-pill text-ink-muted',
    note: 'The holder passed this assessment again; a newer credential replaces this one.',
  },
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function VerifyCredentialPage({ params }: Props) {
  const { id } = await params
  const credential = await load(id)

  if (!credential || credential === 'error') {
    return (
      <AppPageShell>
        <div className="page-shell max-w-3xl">
          <PageHeader
            title={credential === 'error' ? 'Can’t check right now' : 'No such credential'}
            description={
              credential === 'error'
                ? 'The credential service is unavailable. Try again in a few minutes.'
                : `Nexus has no credential with the id ${decodeURIComponent(id).toUpperCase()}. Check the id for typos; it looks like NX-XXXX-XXXX-XXXX.`
            }
          />
          <Link href="/verify" className="metalab-link">
            Check another id
          </Link>
        </div>
      </AppPageShell>
    )
  }

  const status = STATUS[credential.status]
  return (
    <AppPageShell>
      <div className="page-shell max-w-4xl">
        {credential.sample && (
          <p className="mb-8 border-b border-line pb-4 text-sm text-caution">
            Sample credential for the guest preview. It does not belong to a real person.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-muted">Nexus credential</span>
          <span className={`pill !h-7 ${status.className}`}>{status.label}</span>
        </div>

        <h1 className="page-title mt-6">
          {credential.holder.name}
          <span className="title-rule" aria-hidden />
          <br />
          <span className="pl-[0.6em]">{credential.skillName}</span>
        </h1>
        <p className="mt-6 max-w-[36rem] text-base leading-relaxed text-ink-muted">
          Passed <span className="text-ink">{credential.title}</span>,{' '}
          {credential.level.toLowerCase()}, with a score of {credential.score}
          {credential.passThreshold !== null &&
            ` against a pass mark of ${credential.passThreshold}`}
          .
        </p>
        {status.note && <p className="mt-4 text-sm text-caution">{status.note}</p>}

        <dl className="mt-12 grid gap-x-12 gap-y-6 border-t border-line pt-8 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-faint">Mode</dt>
            <dd className="mt-1 text-ink">{credential.modeLabel}</dd>
            <dd className="mt-1 text-sm text-ink-muted">
              {credential.mode === 'ai_assisted'
                ? 'AI tools were allowed, as at work. Explanations had to be the holder’s own.'
                : 'Done without AI tools or outside help; pastes and tab switches were recorded.'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Identity</dt>
            <dd className="mt-1 text-ink">{credential.identity.label}</dd>
            <dd className="mt-1 text-sm text-ink-muted">{credential.identity.detail}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Issued</dt>
            <dd className="mt-1 text-ink">{formatDate(credential.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">
              {credential.status === 'EXPIRED' ? 'Expired' : 'Valid until'}
            </dt>
            <dd className="mt-1 text-ink">{formatDate(credential.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Credential id</dt>
            <dd className="mt-1 font-mono text-ink">{credential.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">Graded with</dt>
            <dd className="mt-1 text-ink">
              Rubric {credential.rubric.id} v{credential.rubric.version}, challenge{' '}
              {credential.challenge.id} v{credential.challenge.version}
            </dd>
          </div>
        </dl>

        {credential.measures.length > 0 && (
          <section aria-labelledby="measured-heading" className="mt-12">
            <h2 id="measured-heading" className="text-base font-medium">
              What was measured
            </h2>
            <ul className="mt-4 space-y-2 text-[0.9375rem] leading-relaxed text-ink-muted">
              {credential.measures.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="reading-heading" className="mt-12 border-t border-line pt-8">
          <h2 id="reading-heading" className="text-base font-medium">
            How to read this
          </h2>
          <p className="mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed text-ink-muted">
            The holder completed a timed, hands-on task with a follow-up and questions about their
            own work. Automatic results came from hidden tests generated for their attempt; judged
            criteria were scored against a published rubric, and unusual attempts were reviewed by a
            person. It shows what they did in one sitting, at the level named. It is not a licence
            or a degree.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {credential.holder.profilePath && (
              <Link href={credential.holder.profilePath} className="metalab-link">
                {credential.holder.name}’s Skill Passport
              </Link>
            )}
            <Link href="/assessments" className="metalab-link">
              About Nexus assessments
            </Link>
          </div>
        </section>
      </div>
    </AppPageShell>
  )
}
