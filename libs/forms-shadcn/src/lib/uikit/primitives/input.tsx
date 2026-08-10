'use client'

import type { UIKitInputProps } from '@letar/forms-core/uikit'
import { cn } from '../../utils/cn'
import { NATIVE_INPUT_CLASS } from './native-input-class'

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
      className={cn(NATIVE_INPUT_CLASS, 'aria-invalid:border-destructive aria-invalid:ring-destructive/20')}
    />
  )
}
