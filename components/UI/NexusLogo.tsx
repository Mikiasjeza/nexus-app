type NexusLogoProps = {
  /** Height of the block in px; the word scales with it. */
  size?: number
  className?: string
}

/**
 * The wordmark: "Nexus" set bold and tight in a solid block of the page's ink,
 * so it is a light block on a dark page and a black block on a light one.
 * Decorative wrapper only: links go outside.
 */
export default function NexusLogo({ size = 48, className = '' }: NexusLogoProps) {
  return (
    <span
      className={`inline-flex items-center bg-ink font-bold leading-none tracking-[-0.055em] text-ground ${className}`}
      style={{ height: size, padding: `0 ${Math.round(size * 0.3)}px`, fontSize: size * 0.44 }}
    >
      Nexus
    </span>
  )
}
