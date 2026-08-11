'use client'

import type { UIKitNativeSelectProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'

export function NativeSelect(
  { value, onChange, onBlur, options, placeholder, disabled, ...rest }: UIKitNativeSelectProps,
) {
  return (
    <select
      data-slot="native-select"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      data-field-name={rest['data-field-name']}
      className={cn(
        'border-input flex h-9 w-full items-center rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
