'use client'

import type { UIKitFieldRootProps } from '@letar/forms-core/uikit'
import type { ReactNode } from 'react'

export function FieldRoot({ invalid, disabled, children }: UIKitFieldRootProps<ReactNode>) {
  return (
    <div
      data-slot="field-root"
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      className="space-y-2"
    >
      {children}
    </div>
  )
}
