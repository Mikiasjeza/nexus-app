import type { CriterionScore } from '@/lib/assessments/types'

const BY: Record<CriterionScore['assessedBy'], string> = {
  tests: 'Hidden tests',
  checks: 'Automatic checks',
  ai: 'AI grader',
  human: 'Reviewer',
  none: 'Not scored yet',
}

/** Rubric criteria as rows: weight, how it was scored, a bar, and the evidence. */
export default function CriteriaList({
  criteria,
  pendingLabel = 'Not scored yet',
}: {
  criteria: Pick<
    CriterionScore,
    'id' | 'label' | 'weight' | 'score' | 'evidence' | 'notes' | 'assessedBy'
  >[]
  pendingLabel?: string
}) {
  return (
    <ul className="ruled-list border-t border-line">
      {criteria.map((c) => {
        const pct = c.score === null ? null : Math.round(c.score * 100)
        return (
          <li key={c.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-ink">{c.label}</span>
              <span className="text-sm text-ink-faint">
                {c.score === null ? pendingLabel : BY[c.assessedBy]} · weight {c.weight}%
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-pill"
                role="meter"
                aria-label={c.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct ?? undefined}
                aria-valuetext={pct === null ? pendingLabel : `${pct}%`}
              >
                {pct !== null && (
                  <div className="h-full rounded-full bg-verified" style={{ width: `${pct}%` }} />
                )}
              </div>
              <span className="display-number w-14 text-right text-xl tabular-nums">
                {pct === null ? '—' : `${pct}%`}
              </span>
            </div>
            {(c.evidence.length > 0 || c.notes) && (
              <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-muted">
                {c.notes && <p>{c.notes}</p>}
                {c.evidence.map((line, i) =>
                  c.assessedBy === 'ai' || c.assessedBy === 'human' ? (
                    <p
                      key={i}
                      className="border-l border-line-strong pl-3 font-mono text-xs text-ink-faint"
                    >
                      {line}
                    </p>
                  ) : (
                    <p key={i}>{line}</p>
                  )
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
