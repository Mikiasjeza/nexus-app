type NexusLogoProps = {
  /** Height of the block in px; the word scales with it. */
  size?: number
  className?: string
}

/**
 * The wordmark: "Nexus" set bold and tight in a solid black block. It is the
 * same on white and on black (there it gains a white outline from the page).
 * Decorative wrapper only: links go outside.
 */
export default function NexusLogo({ size = 48, className = '' }: NexusLogoProps) {
  return (
    <span
      className={`inline-flex items-center bg-[#0b0b0b] font-bold leading-none tracking-[-0.055em] text-white ${className}`}
      style={{ height: size, padding: `0 ${Math.round(size * 0.3)}px`, fontSize: size * 0.44 }}
    >
      Nexus
    </span>
  )
}
