import type { Metadata } from 'next'
import LegalPage, { List, Mail, Section, TableWrap } from '@/components/Legal/LegalPage'
import CookiePreferencesButton from '@/components/UI/CookiePreferencesButton'
import { LEGAL, STORAGE_ITEMS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Every cookie and browser-storage item Nexus uses, and how to change your choice.',
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      current="/cookies"
      summary={
        <p>
          Nexus uses essential cookies to sign you in and keep your account secure. We don&apos;t use advertising
          cookies, tracking pixels or analytics trackers. The only optional item is diagnostics (masked error replays),
          which stays off unless you turn it on.
        </p>
      }
    >
      <Section title="What cookies are">
        <p>
          Cookies are small text files a website stores in your browser. &quot;Local storage&quot; is a similar browser
          feature. This policy covers both.
        </p>
      </Section>

      <Section title="Everything we store in your browser">
        <TableWrap>
          <thead className="bg-white/[0.03] text-white/80">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Purpose</th>
              <th className="p-3 font-medium">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 align-top">
            {STORAGE_ITEMS.map(item => (
              <tr key={item.name}>
                <td className="p-3 font-mono text-xs text-white/85">{item.name}</td>
                <td className="p-3">{item.kind}</td>
                <td className="p-3">{item.category === 'essential' ? 'Essential' : 'Diagnostics (optional)'}</td>
                <td className="p-3">{item.purpose}</td>
                <td className="p-3">{item.duration}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p>All of these are first-party. No third party can read them.</p>
      </Section>

      <Section title="Categories">
        <List>
          <li>
            <strong className="text-white/85">Essential:</strong> required for sign-in, security and remembering your
            cookie choice. These don&apos;t need consent and can&apos;t be switched off, but you can block them in your
            browser (sign-in will then stop working).
          </li>
          <li>
            <strong className="text-white/85">Diagnostics (optional):</strong> if you turn it on, our error monitor
            (Sentry) keeps a short, privacy-masked replay of the moments before an error (text, inputs and images
            hidden) and sends it only if an error happens. Off by default. Error reports without replays are sent either
            way and contain no personal data or cookies.
          </li>
          <li>
            <strong className="text-white/85">Advertising:</strong> we don&apos;t use any.
          </li>
        </List>
      </Section>

      <Section title="Changing your choice">
        <p>
          You can change or withdraw your choice at any time. Rejecting is as easy as accepting, and it doesn&apos;t limit
          any feature.
        </p>
        <CookiePreferencesButton className="button-base button-primary rounded-lg px-4 py-2 text-sm">
          Open cookie settings
        </CookiePreferencesButton>
        <p>
          We store your choice for 12 months, then ask again. We also respect your browser&apos;s cookie controls.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions: <Mail to={LEGAL.contact.privacy} />.
        </p>
      </Section>
    </LegalPage>
  )
}
