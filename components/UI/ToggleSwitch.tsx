'use client'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <label
      className={`inline-flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-label={label ? undefined : 'Toggle'}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`h-6 w-10 rounded-full transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-verified ${
            checked ? 'bg-verified' : 'bg-pill'
          }`}
        />
        <span
          aria-hidden
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-ink transition-transform duration-150 ease-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}
