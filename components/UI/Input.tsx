'use client'

import { InputHTMLAttributes, forwardRef, useId } from 'react'
import { LucideIcon } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const noteId = `${inputId}-note`

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={inputId} className="metalab-label">
            {label}
            {props.required && <span className="ml-1 text-ink-faint">*</span>}
          </label>
        )}

        <div className="relative">
          {LeftIcon && (
            <LeftIcon
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? noteId : undefined}
            className={`metalab-input ${LeftIcon ? 'pl-10' : ''} ${RightIcon ? 'pr-10' : ''} ${
              error ? '!border-critical/60' : ''
            } ${className}`}
            {...props}
          />

          {RightIcon && (
            <RightIcon
              className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
          )}
        </div>

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

Input.displayName = 'Input'

export default Input
