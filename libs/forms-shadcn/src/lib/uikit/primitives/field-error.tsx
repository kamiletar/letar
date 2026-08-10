'use client'

import type { UIKitFieldErrorProps } from '@letar/forms-core/uikit'
import type { ReactNode } from 'react'

export function FieldError({ hasError, errorMessage, helperText }: UIKitFieldErrorProps<ReactNode>) {
  if (hasError && errorMessage) {
    return (
      <p data-slot="field-error" role="alert" className="text-destructive text-sm">
        {errorMessage}
      </p>
    )
  }
  if (helperText) {
    return (
      <p data-slot="field-helper" className="text-muted-foreground text-sm">
        {helperText}
      </p>
    )
  }
  return null
}
