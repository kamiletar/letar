'use client'

import type { UIKitSegmentGroupProps } from '@letar/forms-core/uikit'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function SegmentGroup({ value, onValueChange, options, disabled, ...rest }: UIKitSegmentGroupProps<ReactNode>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="segment-group"
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix ToggleGroup снимает выбор кликом по активному элементу — контракт SegmentGroup
        // это не предполагает (одно значение всегда выбрано), поэтому пустой next игнорируется.
        if (next) { onValueChange(next) }
      }}
      disabled={disabled}
      data-field-name={rest['data-field-name']}
      className="bg-muted inline-flex items-center gap-1 rounded-md p-1"
    >
      {options.map((opt) => (
        <ToggleGroupPrimitive.Item
          key={opt.value}
          value={opt.value}
          disabled={opt.disabled}
          className={cn(
            'rounded-sm px-3 py-1 text-sm outline-none transition-colors',
            'data-[state=on]:bg-background data-[state=on]:shadow-xs',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {opt.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
