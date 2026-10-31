import NexusMark from './NexusMark'

type NexusLogoProps = {
  /** Height of the mark in px; the word scales with it. */
  size?: number
  className?: string
}

/** The binding mark beside the word "Nexus". Decorative wrapper only: links go outside. */
export default function NexusLogo({ size = 18, className = '' }: NexusLogoProps) {
  return (
    <span className={`inline-flex items-center gap-[0.4em] text-ink ${className}`}>
      <NexusMark size={size} />
      <span
        className="font-medium leading-none tracking-[-0.015em]"
        style={{ fontSize: size * 0.9 }}
      >
        Nexus
      </span>
    </span>
  )
}
