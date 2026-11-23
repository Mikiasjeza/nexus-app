import type { Metadata } from 'next'
import LegalPage, { List, Mail, Section } from '@/components/Legal/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Security',
  description: 'How Nexus protects your account and data, and how to report a security problem.',
}

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      current="/security"
      summary={
        <p>
          Found a security problem? Email <Mail to={LEGAL.contact.security} />. We welcome reports,
          reply quickly, and won’t take action against good-faith research that follows the rules
          below.
        </p>
      }
    >
      <Section title="How we protect your data">
        <List>
          <li>All traffic uses HTTPS, and browsers are told to always use it.</li>
          <li>Passwords are stored only as salted hashes; we never see them.</li>
          <li>
            Sign-in sessions use secure, HTTP-only cookies, and sign-in with Google, Microsoft or
            LinkedIn is protected against forgery.
          </li>
          <li>Repeated sign-in and sign-up attempts are rate-limited.</li>
          <li>Code from assessments runs in an isolated sandbox with no network access.</li>
          <li>Payments are handled by Stripe; card details never reach our servers.</li>
          <li>Error reports are scrubbed of personal details before they are sent.</li>
        </List>
      </Section>

      <Section title="Reporting a vulnerability">
        <p>
          Email <Mail to={LEGAL.contact.security} /> with what you found, the steps to reproduce it,
          and its likely impact. We aim to acknowledge reports within three working days and keep
          you updated until it is fixed.
        </p>
        <p>When testing, please:</p>
        <List>
          <li>only use accounts you own, or test accounts you create;</li>
          <li>never access, change or delete other people’s data;</li>
          <li>don’t run denial-of-service attacks, spam, or social engineering;</li>
          <li>give us reasonable time to fix the problem before telling anyone else.</li>
        </List>
        <p>We don’t currently pay bounties, but we are glad to credit you if you’d like.</p>
      </Section>
    </LegalPage>
  )
}
