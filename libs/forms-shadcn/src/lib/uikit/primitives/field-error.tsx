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
  // Пустой слот того же размера, что и заполненный — иначе поля в одном ряду получают разную
  // высоту в зависимости от того, есть ли у соседа helper/error текст (тот же фикс, что в
  // Chakra-скине — `invisible` убирает из видимости, но не из layout).
  return (
    <p data-slot="field-helper" aria-hidden className="text-muted-foreground text-sm invisible">
      &nbsp;
    </p>
  )
}
