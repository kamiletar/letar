'use client'

import type { UIKitFieldLabelProps } from '@letar/forms-core/uikit'
import * as LabelPrimitive from '@radix-ui/react-label'
import type { ReactNode } from 'react'

export function FieldLabel({ label, required, tooltip }: UIKitFieldLabelProps<ReactNode>) {
  if (!label) { return null }
  return (
    <LabelPrimitive.Root
      data-slot="field-label"
      className="flex items-center gap-1 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50"
    >
      {label}
      {required && <span className="text-destructive">*</span>}
      {tooltip && (
        <span className="text-muted-foreground cursor-help text-xs" title={tooltip.description}>
          (?)
        </span>
      )}
    </LabelPrimitive.Root>
  )
}
