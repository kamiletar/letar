'use client'

import { Textarea } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { TextareaFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.Textarea - Multiline text input field
 *
 * Renders a Chakra Textarea with automatic form integration and error display.
 *
 * Automatically extracts from Zod schema:
 * - `maxLength` from `z.string().max(500)` → maxLength={500}
 * - `helperText` automatically is generated from constraints ("Maximum 500 characters")
 *
 * Props always take priority over automatic values from schema.
 *
 * @example
 * ```tsx
 * <Form.Field.Textarea name="description" label="Description" rows={4} />
 * ```
 *
 * @example With automatic constraints from Zod
 * ```tsx
 * // In schema: z.object({ bio: z.string().max(500) })
 * <Form.Field.Textarea name="bio" label="Bio" autoresize />
 * // Automatically: maxLength={500} helperText="Maximum 500 characters"
 * ```
 */
export const FieldTextarea = createField<TextareaFieldProps, string>({
  displayName: 'FieldTextarea',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { constraints } = resolved

    // Props take priority over constraints
    const maxLength = componentProps.maxLength ?? constraints.string?.maxLength

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <Textarea
          value={(field.state.value as string) ?? ''}
          onChange={(e) => field.handleChange((e.target as HTMLTextAreaElement).value)}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          rows={componentProps.rows}
          autoresize={componentProps.autoresize}
          resize={componentProps.resize ?? 'vertical'}
          maxLength={maxLength}
          autoComplete={resolved.autocomplete}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})
