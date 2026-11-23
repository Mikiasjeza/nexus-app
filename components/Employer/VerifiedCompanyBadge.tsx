import { BadgeCheck } from 'lucide-react'

/** Shown next to a company's name once Nexus has confirmed it's real. */
export default function VerifiedCompanyBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium text-verified-ink ${className}`}
      title="Verified company: someone who runs it confirmed an email on the company's own domain, or Nexus checked it."
    >
      <BadgeCheck className="size-3.5" aria-hidden />
      Verified
    </span>
  )
}
