'use client'

import type { UIKitRadioGroupProps } from '@letar/forms-core/uikit'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function RadioGroup({ value, onValueChange, options, disabled, ...rest }: UIKitRadioGroupProps<ReactNode>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      data-field-name={rest['data-field-name']}
      className="flex flex-col gap-2"
    >
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm">
          <RadioGroupPrimitive.Item
            value={opt.value}
            disabled={opt.disabled}
            className={cn(
              'border-input text-primary aspect-square size-4 shrink-0 rounded-full border shadow-xs outline-none',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
              <Circle className="fill-primary size-2" />
            </RadioGroupPrimitive.Indicator>
          </RadioGroupPrimitive.Item>
          {opt.label}
        </label>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
