'use client'

import type { UIKitCheckboxProps } from '@letar/forms-core/uikit'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function Checkbox(
  { checked, onCheckedChange, onBlur, disabled, readOnly, label, ...rest }: UIKitCheckboxProps<ReactNode>,
) {
  return (
    <label className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        data-slot="checkbox"
        checked={checked}
        onCheckedChange={(state) => onCheckedChange(state === true)}
        onBlur={onBlur}
        disabled={disabled || readOnly}
        data-field-name={rest['data-field-name']}
        className={cn(
          'border-input peer size-4 shrink-0 rounded-[4px] border shadow-xs outline-none transition-shadow',
          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
          'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}
