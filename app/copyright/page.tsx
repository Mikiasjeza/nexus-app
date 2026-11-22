import type { Metadata } from 'next'
import LegalPage, { List, Mail, Section } from '@/components/Legal/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Copyright',
  description: 'How to report content on Nexus that infringes your copyright, and how to respond.',
}

export default function CopyrightPage() {
  return (
    <LegalPage
      title="Copyright"
      current="/copyright"
      summary={
        <p>
          People add their own work to Nexus as evidence. If you believe something on Nexus copies
          your work without permission, tell us and we will take it down while we look into it.
        </p>
      }
    >
      <Section title="Reporting infringement">
        <p>
          Email <Mail to={LEGAL.contact.copyright} /> with the subject “Copyright notice” and
          include:
        </p>
        <List>
          <li>your name, address, phone number and email;</li>
          <li>the work you own, or a link to it;</li>
          <li>the link to the content on Nexus you say infringes it;</li>
          <li>
            a statement that you believe in good faith the use is not authorised by you, your agent
            or the law;
          </li>
          <li>
            a statement, under penalty of perjury, that your notice is accurate and that you own the
            copyright or may act for the owner;
          </li>
          <li>your physical or electronic signature (typing your full name is enough).</li>
        </List>
        <p>
          This follows the notice requirements of the US Digital Millennium Copyright Act (DMCA).
          Knowingly false notices can make you liable for damages.
        </p>
      </Section>

      <Section title="What happens next">
        <p>
          We remove or disable the content, tell the person who added it, and pass on your notice.
          We may share your name and contact details with them.
        </p>
      </Section>

      <Section title="Counter-notice">
        <p>
          If your content was removed and you believe that was a mistake, email the same address
          with: the removed content and where it was; a statement under penalty of perjury that you
          believe it was removed by mistake or misidentification; your name, address and phone
          number; your consent to the jurisdiction of the federal courts for your address (or, if
          outside the US, any district where Nexus may be found) and to accept service from the
          person who sent the notice; and your signature. Unless they tell us they have gone to
          court within 10 to 14 working days, we may restore the content.
        </p>
      </Section>

      <Section title="Repeat infringement">
        <p>We close the accounts of people who repeatedly infringe others’ copyright.</p>
      </Section>
    </LegalPage>
  )
}
