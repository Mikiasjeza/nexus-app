'use client'

import React, { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion, MotionProps } from 'framer-motion'
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
  sm: 'min-h-[42px] px-3.5 text-sm',
  md: 'min-h-[44px] px-4 text-sm',
  lg: 'min-h-[48px] px-5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false, // Alias for isLoading
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading || loading

  const buttonProps: MotionProps & React.ButtonHTMLAttributes<HTMLButtonElement> = {
    whileHover: isDisabled ? undefined : { scale: 1.01, y: -1 },
    whileTap: isDisabled ? undefined : { scale: 0.98 },
    disabled: isDisabled,
    className: cn(
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      'button-base',
      'disabled:opacity-40',
      'disabled:cursor-not-allowed',
      'flex items-center justify-center gap-2',
      className
    ),
    type: props.type ?? 'button',
    ...props,
  }

  return (
    <motion.button {...buttonProps}>
      {isLoading ? (
        <Loader className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex items-center justify-center">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex items-center justify-center">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  )
}
