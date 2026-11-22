import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { List, Mail, Section } from '@/components/Legal/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'How We Use AI',
  description:
    'Where Nexus uses AI, what it can and cannot decide, how to get a human review, and the rules for employers.',
}

export default function AiPage() {
  return (
    <LegalPage
      title="How we use AI"
      current="/ai"
      summary={
        <p>
          Nexus uses AI to check evidence and score assessments. It explains every result, it can be
          wrong, and you can always ask a person to review it. Employers may not use it as the only
          reason to hire or reject someone.
        </p>
      }
    >
      <Section title="Where AI is used">
        <List>
          <li>
            <strong className="text-ink">Skill verification.</strong> It reads the evidence you add
            (code, documents, recordings, links) against the level you claim, and gives a confidence
            score with its reasons.
          </li>
          <li>
            <strong className="text-ink">Assessments.</strong> It helps score open answers against a
            published set of criteria. Code is run in a sandbox and checked by tests.
          </li>
          <li>
            <strong className="text-ink">Job suggestions.</strong> It suggests public roles that fit
            your skills, and answers questions in the career assistant.
          </li>
        </List>
      </Section>

      <Section title="Employer search is not AI">
        <p>
          When an employer searches, Nexus orders discoverable candidates with fixed rules: which of
          the searched skills and pillars they have, and how many are verified. Everyone who matches
          is shown, with the reasons for their position.
        </p>
      </Section>

      <Section title="What AI does not do">
        <List>
          <li>It does not make hiring decisions. Employers do.</li>
          <li>
            It never receives your name or email, and Nexus does not collect details such as age,
            gender or ethnicity.
          </li>
          <li>We only use AI providers whose terms forbid training their models on our data.</li>
          <li>We do not sell your data, or use it for advertising.</li>
        </List>
      </Section>

      <Section title="Its limits">
        <p>
          AI results are opinions, not certifications. They can be incomplete or wrong, especially
          with unusual evidence, languages other than English, or very new tools. Every result shows
          its reasons so you can see what it relied on.
        </p>
      </Section>

      <Section title="Asking for a human review">
        <p>
          If you think an assessment result is wrong, appeal it from the result page. For a skill
          verification, email <Mail to={LEGAL.contact.support} />. A person will look at your work
          and the AI’s reasons, and reply with a decision. You can also improve your evidence and
          run the check again at any time.
        </p>
      </Section>

      <Section title="Rules for employers">
        <List>
          <li>
            Treat Nexus results as one input among several, never as the only basis for a decision
            about a person.
          </li>
          <li>
            Some places regulate software used in hiring, for example New York City (bias audits and
            notices for automated employment decision tools), Illinois, Colorado and the European
            Union. If those rules apply to your hiring, you are responsible for meeting them,
            including any notices to candidates.
          </li>
          <li>
            Follow the employer rules in our{' '}
            <Link href="/terms#employers" className="text-ink underline underline-offset-2">
              Terms of Service
            </Link>
            .
          </li>
        </List>
      </Section>

      <Section title="Questions">
        <p>
          Ask us anything about how AI is used at <Mail to={LEGAL.contact.privacy} />. Your rights
          over your data, including access and deletion, are in our{' '}
          <Link href="/privacy" className="text-ink underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  )
}
