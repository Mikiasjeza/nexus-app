'use client'

import { SelectHTMLAttributes, forwardRef, useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: { value: string; label: string }[]
  fullWidth?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, fullWidth = true, className = '', id, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id ?? generatedId
    const noteId = `${selectId}-note`

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={selectId} className="metalab-label">
            {label}
            {props.required && <span className="ml-1 text-ink-faint">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? noteId : undefined}
          className={`metalab-input ${error ? '!border-critical/60' : ''} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error ? (
          <p id={noteId} className="mt-2 text-sm text-critical">
            {error}
          </p>
        ) : helperText ? (
          <p id={noteId} className="mt-2 text-sm text-ink-faint">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
