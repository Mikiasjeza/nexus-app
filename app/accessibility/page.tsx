import type { Metadata } from 'next'
import LegalPage, { List, Mail, Section } from '@/components/Legal/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'Our accessibility commitment, what we support, known gaps, and how to get help.',
}

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      current="/accessibility"
      summary={
        <p>
          We want everyone to be able to prove their skills on Nexus. We aim to meet the Web Content
          Accessibility Guidelines (WCAG) 2.2 at level AA, and we fix problems as soon as we hear
          about them.
        </p>
      }
    >
      <Section title="What we do">
        <List>
          <li>Pages work with a keyboard alone, with a visible focus outline.</li>
          <li>Pages use headings, labels and landmarks that screen readers announce.</li>
          <li>Text and controls are designed for strong contrast against the background.</li>
          <li>Motion is reduced when your device asks for reduced motion.</li>
          <li>Pages reflow on small screens and when zoomed to 200%.</li>
        </List>
      </Section>

      <Section title="Known gaps">
        <List>
          <li>
            The code editor in coding assessments can be hard to use with some screen readers.
          </li>
          <li>Charts show their numbers on hover; we are adding text alternatives for each.</li>
          <li>
            Timed assessments may not suit everyone. If you need more time or another format, ask us
            before you start.
          </li>
        </List>
      </Section>

      <Section title="Getting help or adjustments">
        <p>
          If something on Nexus is hard to use, or you need an adjustment for an assessment, email{' '}
          <Mail to={LEGAL.contact.support} /> with the page and what happened. We aim to reply
          within five working days, and we can provide information in another format.
        </p>
      </Section>
    </LegalPage>
  )
}
