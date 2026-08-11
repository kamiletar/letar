'use client'

import type { UIKitNumberInputProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'

export function NumberInput(
  { value, onChange, onBlur, min, max, step, disabled, readOnly, ...rest }: UIKitNumberInputProps,
) {
  return (
    <input
      data-slot="number-input"
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        onChange(raw === '' ? null : Number(raw))
      }}
      onBlur={onBlur}
      min={min}
      max={max}
      step={step}
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
