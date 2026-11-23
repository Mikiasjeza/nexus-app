'use client'

import { useEffect, useState } from 'react'
import { ProviderIcon } from '@/components/Auth/SocialSignIn'
import { linkedInAddToProfileUrl, linkedInShareUrl, type LinkedInCredential } from '@/lib/linkedin'

type Props = Omit<LinkedInCredential, 'url'> & {
  /** Path of the public credential page, e.g. /verify/NX-…; made absolute here. */
  verifyPath: string
}

/**
 * "Add to LinkedIn" (the certification form, filled in) and "Share on
 * LinkedIn" (a post linking to the credential). Both open LinkedIn in a new
 * tab; the person confirms there.
 */
export default function LinkedInButtons({ verifyPath, ...credential }: Props) {
  // The public address needs the site's origin, which is only known in the browser.
  const [origin, setOrigin] = useState<string | null>(null)
  useEffect(() => setOrigin(window.location.origin), [])
  if (!origin) return null

  const url = `${origin}${verifyPath}`
  return (
    <>
      <a
        href={linkedInAddToProfileUrl({ ...credential, url })}
        target="_blank"
        rel="noopener noreferrer"
        className="button-base button-secondary"
      >
        <ProviderIcon id="linkedin" className="size-4" />
        Add to LinkedIn
        <span className="sr-only"> (opens LinkedIn in a new tab)</span>
      </a>
      <a
        href={linkedInShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="button-base button-ghost"
      >
        Share on LinkedIn
        <span className="sr-only"> (opens LinkedIn in a new tab)</span>
      </a>
    </>
  )
}
