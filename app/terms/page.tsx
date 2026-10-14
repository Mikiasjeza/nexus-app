import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { List, Mail, Section } from '@/components/Legal/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The rules for using Nexus, including subscriptions, cancellation and AI verification.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      current="/terms"
      summary={
        <>
          <p className="mb-2 font-medium text-white">The short version</p>
          <List>
            <li>
              You own your content. You give us permission to use it only to run Nexus for you.
            </li>
            <li>
              AI verification is an informed opinion, not a certification, and it can be wrong.
            </li>
            <li>
              Paid plans renew monthly until you cancel. You can cancel yourself in Settings, no
              call or email needed, and you keep access until the end of the period you paid for.
            </li>
            <li>You can delete your account at any time.</li>
          </List>
        </>
      }
    >
      <Section title="1. Agreement">
        <p>
          These terms are an agreement between you and {LEGAL.LEGAL_ENTITY} (&quot;Nexus&quot;). By
          creating an account or using the service you agree to them and to our{' '}
          <Link
            href="/privacy"
            className="underline decoration-white/20 underline-offset-2 hover:text-white"
          >
            Privacy Policy
          </Link>
          . If you don&apos;t agree, please don&apos;t use Nexus.
        </p>
      </Section>

      <Section title="2. Eligibility and accounts">
        <List>
          <li>You must be at least 16 years old.</li>
          <li>
            Give accurate account information and keep your password secure. You&apos;re responsible
            for activity under your account.
          </li>
          <li>
            Tell us promptly at <Mail to={LEGAL.contact.support} /> if you suspect unauthorized
            access.
          </li>
        </List>
      </Section>

      <Section title="3. Your content">
        <p>
          You keep all rights to the skills, evidence, files and other content you submit
          (&quot;Your Content&quot;). You grant Nexus a limited, non-exclusive, worldwide,
          royalty-free licence to host, process, display and transmit Your Content only as needed to
          provide the service to you, including sending evidence to our AI provider when you request
          verification and showing content you mark public on your shareable profile.
        </p>
        <p>
          This licence ends when you delete the content or your account, except for copies that
          others already viewed through a public link you shared and backups that are overwritten on
          a short rolling schedule.
        </p>
        <p>
          You confirm that you have the right to submit Your Content and that it doesn&apos;t
          misrepresent your own work. Submitting someone else&apos;s work as your evidence is not
          allowed.
        </p>
      </Section>

      <Section title="4. AI verification">
        <List>
          <li>
            Verification scores and explanations are generated automatically by AI models from the
            evidence you provide. They are opinions, not guarantees or professional certifications.
          </li>
          <li>
            Results may be incomplete or inaccurate. You can improve your evidence and re-run
            verification, or request a human review at <Mail to={LEGAL.contact.support} />.
          </li>
          <li>
            Anyone viewing your passport should treat results as one input, not as the sole basis
            for decisions about you.
          </li>
        </List>
      </Section>

      <Section title="5. Acceptable use">
        <p>Don&apos;t:</p>
        <List>
          <li>
            break the law, or infringe anyone&apos;s rights, including by uploading content you
            don&apos;t have rights to;
          </li>
          <li>
            upload malware, or attempt to access accounts or systems you&apos;re not authorized to
            access;
          </li>
          <li>scrape, overload or interfere with the service, or bypass usage limits;</li>
          <li>
            attempt to manipulate AI verification, for example with prompt injection or fabricated
            evidence;
          </li>
          <li>use Nexus to harass, discriminate against, or deceive others.</li>
        </List>
      </Section>

      <Section title="5a. Employer accounts">
        <p>If you use Nexus to find candidates, you also agree to:</p>
        <List>
          <li>use candidate profiles only to recruit for real roles at your company;</li>
          <li>
            not copy, export, sell or combine candidate data with other sources to build profiles;
          </li>
          <li>
            comply with applicable employment, anti-discrimination and data-protection laws,
            including acting as an independent controller for any candidate data you take outside
            Nexus;
          </li>
          <li>not treat AI verification results as the sole basis for a hiring decision;</li>
          <li>post only genuine job listings, with accurate details.</li>
        </List>
        <p>
          Candidates can withdraw from employer search at any time, which removes them from your
          search results and shortlists.
        </p>
      </Section>

      <Section title="6. Plans, billing and cancellation">
        <List>
          <li>
            <strong className="text-white/85">Free plan:</strong> available at no cost with the
            limits shown on the{' '}
            <Link
              href="/pricing"
              className="underline decoration-white/20 underline-offset-2 hover:text-white"
            >
              pricing page
            </Link>
            .
          </li>
          <li>
            <strong className="text-white/85">Paid plans</strong> are billed monthly in advance
            through Stripe at the price shown before you confirm checkout, plus any applicable
            taxes.{' '}
            <strong className="text-white/85">
              They renew automatically each month until you cancel.
            </strong>
          </li>
          <li>
            <strong className="text-white/85">Cancel any time</strong> in Settings → Billing →
            Manage billing. Cancellation stops future renewals; you keep paid features until the end
            of the current billing period. We don&apos;t ask you to call or email to cancel.
          </li>
          <li>
            <strong className="text-white/85">Refunds:</strong> payments are non-refundable except
            where required by law or if we fail to provide the service. If you&apos;re in a
            jurisdiction with a statutory withdrawal right, it applies.
          </li>
          <li>
            <strong className="text-white/85">Price changes:</strong> we&apos;ll email you at least
            30 days before a price change affects your subscription, and you can cancel before it
            takes effect.
          </li>
        </List>
      </Section>

      <Section title="7. Ending your use">
        <p>
          You can delete your account at any time from Settings. We may suspend or close an account
          that seriously or repeatedly breaks these terms. Except where we must act immediately to
          prevent harm or comply with law, we&apos;ll tell you why and give you a chance to respond
          and to export your data first. If we close a paid account without cause, we&apos;ll refund
          the unused portion of your subscription.
        </p>
      </Section>

      <Section title="8. Our intellectual property">
        <p>
          The Nexus software, design and brand belong to us and our licensors. These terms
          don&apos;t give you rights to them other than to use the service as intended.
        </p>
      </Section>

      <Section title="9. Changes to the service and these terms">
        <p>
          We may update Nexus over time. If we change these terms in a way that materially affects
          you, we&apos;ll email you at least 14 days before the change takes effect. If you
          don&apos;t agree, you can cancel and delete your account before then.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          Nexus is provided &quot;as is&quot; and &quot;as available&quot;. To the extent permitted
          by law, we disclaim implied warranties of merchantability, fitness for a particular
          purpose and non-infringement. We don&apos;t guarantee that the service will be
          uninterrupted or error-free, or that any employer will accept a verification.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          To the extent permitted by law, Nexus is not liable for indirect, incidental, special or
          consequential damages, or lost profits, and our total liability for any claim is limited
          to the greater of the amount you paid us in the 12 months before the claim or US$100.
          Nothing in these terms limits liability that cannot be limited by law, including for
          fraud, gross negligence, or death or personal injury caused by negligence, and nothing
          affects your statutory consumer rights.
        </p>
      </Section>

      <Section title="12. Governing law and disputes">
        <p>
          These terms are governed by the laws of {LEGAL.GOVERNING_LAW}, without regard to
          conflict-of-law rules. If you are a consumer, you also keep the protection of the
          mandatory laws of the country where you live and may bring claims in your local courts.
          Before filing a claim, please contact us so we can try to resolve it informally.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions about these terms: <Mail to={LEGAL.contact.legal} />.
        </p>
      </Section>
    </LegalPage>
  )
}
