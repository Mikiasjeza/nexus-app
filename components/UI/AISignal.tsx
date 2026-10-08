import { Sparkles } from 'lucide-react'
import { memo } from 'react'

/** Ambient AI hints — CSS-only motion (no Framer runtime). */
function AISignal({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 82% 54% at 50% 20%, rgba(0, 217, 255, 0.07) 0%, rgba(147, 51, 234, 0.04) 32%, rgba(255, 111, 145, 0.025) 52%, transparent 74%)',
        }}
      />

      <div className="pointer-events-none absolute right-4 top-4 h-12 w-12 ai-signal-orbit">
        <span className="ai-signal-dot ai-signal-dot-a absolute left-1/2 top-0 block h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-400/70" />
        <span className="ai-signal-dot ai-signal-dot-b absolute right-0 top-1/2 block h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-fuchsia-400/65" />
      </div>

      <div className="ai-signal-label pointer-events-none absolute right-4 top-[3.25rem] flex items-center gap-2 text-xs text-white/35">
        <Sparkles className="h-3 w-3 text-cyan-400/90" />
        <span>AI-assisted</span>
      </div>
    </div>
  )
}

export default memo(AISignal)
