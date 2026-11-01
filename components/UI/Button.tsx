'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loading?: boolean // Alias for isLoading
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  children?: ReactNode
  disabled?: boolean
}

const variants = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  outline: 'button-secondary',
  ghost: 'button-ghost',
  danger: 'button-danger',
}

const sizes = {
  sm: 'min-h-9 px-4 text-sm',
  md: 'min-h-11 px-5 text-[0.9375rem]',
  lg: 'min-h-12 px-6 text-base',
}

/** Pill button. Presses scale slightly; nothing lifts, glows or bounces. */
export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const busy = isLoading || loading
  const isDisabled = disabled || busy

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      className={cn(
        'button-base',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    >
      {busy ? (
        <Loader className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        leftIcon && <span className="flex items-center justify-center">{leftIcon}</span>
      )}
      {children}
      {!busy && rightIcon && <span className="flex items-center justify-center">{rightIcon}</span>}
    </button>
  )
}
