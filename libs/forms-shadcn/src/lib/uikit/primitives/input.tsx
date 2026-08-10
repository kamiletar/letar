'use client'

import type { UIKitInputProps } from '@letar/forms-core/uikit'
import { cn } from '../../utils/cn'

export function Input({
  value,
  onChange,
  onBlur,
  type,
  inputMode,
  placeholder,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  disabled,
  readOnly,
  ...rest
}: UIKitInputProps) {
  return (
    <input
      data-slot="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      type={type}
      inputMode={inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
      placeholder={placeholder}
      maxLength={maxLength}
      minLength={minLength}
      pattern={pattern}
      autoComplete={autoComplete}
      disabled={disabled}
      readOnly={readOnly}
      data-field-name={rest['data-field-name']}
      className={cn(
        'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      )}
    />
  )
}
