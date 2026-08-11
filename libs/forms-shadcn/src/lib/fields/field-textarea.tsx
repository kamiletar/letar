'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '@letar/tailwind-utils'
import type { TextareaFieldProps } from './types'

/**
 * Form.Field.Textarea — shadcn-скин.
 *
 * Нативный `<textarea>` — как и в Chakra-скине, многострочный текст не входит в core-контракт
 * UIKit (см. `field-string.tsx` для сравнения с `Input`, который в контракте есть).
 */
export const FieldTextarea = createField<TextareaFieldProps, string>({
  displayName: 'FieldTextarea',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <textarea
        data-slot="textarea"
        value={(field.state.value as string) ?? ''}
        onChange={(e) =>
          field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={resolved.placeholder}
        rows={componentProps.rows ?? 3}
        maxLength={componentProps.maxLength}
        autoComplete={componentProps.autoComplete}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        data-field-name={fullPath}
        className={cn(
          'border-input placeholder:text-muted-foreground flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        )}
      />
    </FieldWrapper>
  ),
})
