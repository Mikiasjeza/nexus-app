'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
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
  ({ label, error, helperText, leftIcon: LeftIcon, rightIcon: RightIcon, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <LeftIcon className="w-5 h-5" />
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full
              px-4 py-3
              ${LeftIcon ? 'pl-12' : ''}
              ${RightIcon ? 'pr-12' : ''}
              bg-white dark:bg-black
              border
              ${error ? 'border-black/40 dark:border-white/40' : 'border-black/10 dark:border-white/10'}
              text-black dark:text-white
              placeholder:text-black/40 dark:placeholder:text-white/40
              focus:border-black dark:focus:border-white
              focus:outline-none
              transition-colors
              ${className}
            `}
            {...props}
          />
          
          {RightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <RightIcon className="w-5 h-5" />
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
