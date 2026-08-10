'use client'

import type { UIKitErrorFallbackProps } from '@letar/forms-core/uikit'

export function ErrorFallback({ fieldName, message }: UIKitErrorFallbackProps) {
  return (
    <div data-slot="field-error-fallback" className="border-destructive bg-destructive/10 rounded-md border p-3">
      <p className="text-destructive text-sm">
        Ошибка в поле &quot;{fieldName}&quot;: {message}
      </p>
    </div>
  )
}
