import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { List, Mail, Section, TableWrap } from '@/components/Legal/LegalPage'
import { LEGAL, SUBPROCESSORS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Nexus collects, why, who it is shared with, and how to export or delete it.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      current="/privacy"
      summary={
        <>
          <p className="mb-2 font-medium text-white">The short version</p>
          <List>
            <li>
              We collect only what we need to run your skill passport: your account, the skills and
              evidence you add, and billing status if you upgrade.
            </li>
            <li>
              We don&apos;t sell your data, show ads, or run advertising or analytics trackers in
              your browser.
            </li>
            <li>
              Your profile is private until you turn on public sharing, and employers can only find
              you if you separately opt in.
            </li>
            <li>You can download or permanently delete your data at any time from Settings.</li>
          </List>
        </>
      }
    >
      <Section title="1. Who we are">
        <p>
          {LEGAL.LEGAL_ENTITY} (&quot;Nexus&quot;, &quot;we&quot;, &quot;us&quot;) operates this
          service and is the controller of your personal data.
          {LEGAL.POSTAL_ADDRESS ? ` Our address is ${LEGAL.POSTAL_ADDRESS}.` : ''} Questions or
          requests: <Mail to={LEGAL.contact.privacy} />.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p className="font-medium text-white/85">Information you give us</p>
        <List>
          <li>
            <strong className="text-white/85">Account:</strong> name, email address and password.
            Passwords are stored only as a one-way bcrypt hash.
          </li>
          <li>
            <strong className="text-white/85">Optional profile details:</strong> bio, avatar and
            custom profile link, only if you add them.
          </li>
          <li>
            <strong className="text-white/85">Skills and evidence:</strong> skill names, levels,
            notes, links, code snippets and files you choose to submit, plus a change history so you
            can see how a skill evolved.
          </li>
          <li>
            <strong className="text-white/85">Onboarding answers (optional):</strong> the goals and
            starter skills you pick during setup.
          </li>
          <li>
            <strong className="text-white/85">AI career assistant:</strong> the messages you type
            into the chat.
          </li>
          <li>
            <strong className="text-white/85">Messages:</strong> anything you send us by email or
            through the contact form. Contact-form messages are forwarded to our support inbox and
            not stored in our database.
          </li>
          <li>
            <strong className="text-white/85">Employer accounts:</strong> if you sign up as an
            employer, your company name, website, logo and description, your role, the job listings
            you post and the talent pools you create.
          </li>
        </List>
        <p className="font-medium text-white/85">Information created when you use Nexus</p>
        <List>
          <li>
            <strong className="text-white/85">AI verification results:</strong> the confidence
            score, explanation and suggestions returned for your evidence, plus token usage so we
            can enforce plan limits.
          </li>
          <li>
            <strong className="text-white/85">Activity log:</strong> in-product events such as
            &quot;skill added&quot; shown on your dashboard.
          </li>
          <li>
            <strong className="text-white/85">Billing status:</strong> your plan, subscription
            status and Stripe customer ID. We never receive or store card numbers.
          </li>
          <li>
            <strong className="text-white/85">Sign-in session:</strong> a random session token
            stored in an HTTP-only cookie.
          </li>
        </List>
        <p className="font-medium text-white/85">If you choose &quot;Continue with GitHub&quot;</p>
        <List>
          <li>
            Your GitHub user ID, username, display name, avatar and email. We request read-only
            access to your profile and email, use it once to sign you in, and don&apos;t store the
            access token. You can revoke Nexus&apos;s access at any time in your GitHub settings.
          </li>
        </List>
        <p className="font-medium text-white/85">Technical data</p>
        <List>
          <li>
            Your IP address is used briefly in memory to rate-limit sign-in and other sensitive
            requests. We don&apos;t store it in our database. Our hosting provider keeps standard
            request logs for security and reliability.
          </li>
          <li>
            When an error occurs, our error monitor (Sentry) receives the error details, page
            address (with tokens and emails removed) and browser type. It does not receive your IP
            address, cookies or account details.
          </li>
          <li>
            Only if you allow &quot;Diagnostics&quot; in cookie settings: a short replay of the
            moments before an error, with all text, form inputs and images hidden.
          </li>
        </List>
        <p className="font-medium text-white/85">What we deliberately don&apos;t collect</p>
        <List>
          <li>
            No advertising or cross-site tracking cookies, tracking pixels or device fingerprinting.
          </li>
          <li>No precise location, contacts, or data from other apps.</li>
          <li>
            No product-analytics scripts, and no session recording unless you opt in to diagnostics.
          </li>
        </List>
      </Section>

      <Section title="3. How we use it, and our legal basis">
        <TableWrap>
          <thead className="bg-white/[0.03] text-white/80">
            <tr>
              <th className="p-3 font-medium">Purpose</th>
              <th className="p-3 font-medium">Legal basis (GDPR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            <tr>
              <td className="p-3">Create and run your account and skill passport</td>
              <td className="p-3">Performance of our contract with you</td>
            </tr>
            <tr>
              <td className="p-3">
                Run AI verification, the career assistant and job matching when you use them
              </td>
              <td className="p-3">Performance of contract</td>
            </tr>
            <tr>
              <td className="p-3">Show your profile to employers, only if you opt in</td>
              <td className="p-3">Consent, which you can withdraw at any time in Settings</td>
            </tr>
            <tr>
              <td className="p-3">
                Detect and fix errors (error monitoring without personal data)
              </td>
              <td className="p-3">Legitimate interest in a working service</td>
            </tr>
            <tr>
              <td className="p-3">Process payments and keep billing records</td>
              <td className="p-3">Contract; legal obligation (tax and accounting)</td>
            </tr>
            <tr>
              <td className="p-3">Prevent abuse, secure accounts, rate limiting</td>
              <td className="p-3">Legitimate interest in keeping the service safe</td>
            </tr>
            <tr>
              <td className="p-3">Send service emails (e.g. password reset)</td>
              <td className="p-3">Performance of contract</td>
            </tr>
            <tr>
              <td className="p-3">Masked error replays (diagnostics)</td>
              <td className="p-3">Consent, which you can withdraw at any time</td>
            </tr>
          </tbody>
        </TableWrap>
        <p>We do not send marketing emails. If we ever offer them, they will be opt-in only.</p>
      </Section>

      <Section title="4. AI processing">
        <p>
          We use one AI provider at a time (Google Gemini, OpenAI or Anthropic). Depending on the
          feature you use, we send it:
        </p>
        <List>
          <li>
            <strong className="text-white/85">Verification:</strong> the skill name, claimed level
            and the evidence content you submitted.
          </li>
          <li>
            <strong className="text-white/85">Career assistant and job matching:</strong> your skill
            names, levels and verification status, the message you typed, and public job listings.
          </li>
        </List>
        <p>
          We never send your name or email. We use the providers&apos; paid API tiers, under which
          they do not use our API data to train their models. We store only the results we show you
          (score, explanation, suggestions, matches) and token usage, not the provider&apos;s full
          raw response.
        </p>
        <p>
          AI results are informational and can be wrong. No legal or similarly significant decision
          is made about you solely by automated means. You can re-run a verification, edit your
          evidence, or ask us for a human review at <Mail to={LEGAL.contact.support} />.
        </p>
      </Section>

      <Section title="5. Who we share data with">
        <p>
          We don&apos;t sell or rent personal data, and we don&apos;t &quot;share&quot; it for
          cross-context behavioral advertising (as those terms are defined under California law). We
          share data only with the service providers below, who process it on our behalf. Apart from
          our error monitor (Sentry), we call them from our servers and none of them load scripts on
          Nexus pages. Sentry&apos;s browser reporting goes through our own domain. (Stripe&apos;s
          checkout and billing pages are hosted by Stripe under its own privacy policy.)
        </p>
        <TableWrap>
          <thead className="bg-white/[0.03] text-white/80">
            <tr>
              <th className="p-3 font-medium">Provider</th>
              <th className="p-3 font-medium">Purpose</th>
              <th className="p-3 font-medium">Data</th>
              <th className="p-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 align-top">
            {SUBPROCESSORS.map((p) => (
              <tr key={p.name}>
                <td className="p-3 text-white/85">
                  {p.policyUrl ? (
                    <a
                      href={p.policyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-white/20 underline-offset-2 hover:text-white"
                    >
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                </td>
                <td className="p-3">{p.purpose}</td>
                <td className="p-3">{p.data}</td>
                <td className="p-3">{p.when}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p>
          <strong className="text-white/85">Public profile:</strong> if you turn on public sharing,
          anyone with your link can see your name, bio, avatar and the skills you marked public.
          Your email is never shown. Turn sharing off in Settings at any time.
        </p>
        <p>
          <strong className="text-white/85">Employers:</strong> employers on Nexus can search for
          candidates only if you turn on <em>both</em> your public profile and &quot;Discoverable by
          employers&quot; in Settings. They see the same information as your public profile (name,
          bio, avatar, public skills and verification status), never your email or private skills,
          and they can save you to a shortlist (&quot;talent pool&quot;). If you switch either
          setting off or delete your account, you disappear from search and from every shortlist
          straight away. Employers must use what they see only for recruiting, as required by our
          Terms.
        </p>
        <p>
          We may also disclose data if required by law, or to protect the rights and safety of our
          users, and to a successor if Nexus is merged or acquired (we will notify you first).
        </p>
      </Section>

      <Section title="6. International transfers">
        <p>
          Our providers may process data in the United States and other countries. Where required,
          transfers rely on safeguards such as the EU Standard Contractual Clauses.
        </p>
      </Section>

      <Section title="7. How long we keep it">
        <List>
          <li>
            <strong className="text-white/85">
              Account, skills, evidence, AI results, activity:
            </strong>{' '}
            until you delete them or your account.
          </li>
          <li>
            <strong className="text-white/85">Company, job listings and talent pools:</strong> until
            deleted, or until the last member of the company deletes their account.
          </li>
          <li>
            <strong className="text-white/85">Error reports (Sentry):</strong> up to 90 days.
          </li>
          <li>
            <strong className="text-white/85">Sign-in sessions:</strong> expire after 7 days.
          </li>
          <li>
            <strong className="text-white/85">Password reset tokens:</strong> expire after use or
            within a short time.
          </li>
          <li>
            <strong className="text-white/85">Billing records:</strong> kept by Stripe for as long
            as tax and accounting law requires.
          </li>
          <li>
            <strong className="text-white/85">Backups:</strong> deleted data may remain in encrypted
            backups for up to 30 days before being overwritten.
          </li>
        </List>
      </Section>

      <Section title="8. Your rights and choices">
        <p>Wherever you live, you can:</p>
        <List>
          <li>
            <strong className="text-white/85">Access and export:</strong> Settings → Privacy &amp;
            data → <em>Download my data</em> gives you a machine-readable copy.
          </li>
          <li>
            <strong className="text-white/85">Correct:</strong> edit your profile and skills at any
            time.
          </li>
          <li>
            <strong className="text-white/85">Delete:</strong> Settings → <em>Delete account</em>{' '}
            permanently removes your account and content. It takes effect immediately and cancels
            any active subscription.
          </li>
          <li>
            <strong className="text-white/85">Withdraw consent:</strong> change cookie choices any
            time via{' '}
            <Link
              href="/cookies"
              className="underline decoration-white/20 underline-offset-2 hover:text-white"
            >
              Cookie settings
            </Link>
            .
          </li>
          <li>
            <strong className="text-white/85">Object or restrict</strong> processing based on
            legitimate interests.
          </li>
        </List>
        <p>
          For anything else, email <Mail to={LEGAL.contact.privacy} />. We respond within 30 days
          and won&apos;t treat you differently for using your rights. If you&apos;re in the EU/UK,
          you can also complain to your local data protection authority.
        </p>
      </Section>

      <Section title="9. Security">
        <p>
          We use TLS for all traffic, store passwords only as salted hashes, keep session cookies
          HTTP-only and limit access to production data. No system is perfectly secure; if a breach
          affects your data we will notify you as required by law.
        </p>
      </Section>

      <Section title="10. Children">
        <p>
          Nexus is not intended for anyone under 16, and we don&apos;t knowingly collect their data.
          If you believe a child has signed up, contact us and we&apos;ll delete the account.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          If we make a material change, we&apos;ll email you and show a notice in the app at least
          14 days before it takes effect. The effective date at the top always reflects the current
          version.
        </p>
      </Section>
    </LegalPage>
  )
}
