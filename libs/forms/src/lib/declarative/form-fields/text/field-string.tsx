'use client'

import { Input } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { StringFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.String - String input field
 *
 * Renders a Chakra Input with automatic form integration and error display.
 *
 * Automatically extracts from Zod schema:
 * - `type` from `z.string().email()` → type="email", `z.string().url()` → type="url"
 * - `maxLength` from `z.string().max(100)` → maxLength={100}
 * - `minLength` from `z.string().min(2)` → minLength={2}
 * - `pattern` from `z.string().regex(/.../)` → pattern="..."
 * - `helperText` automatically generated from constraints ("Maximum 100 characters")
 *
 * Props always take priority over automatic values from schema.
 *
 * @example
 * ```tsx
 * <Form.Field.String name="title" label="Title" required />
 * ```
 *
 * @example With automatic constraints from Zod
 * ```tsx
 * // In schema: z.object({ email: z.string().email().max(255) })
 * <Form.Field.String name="email" />
 * // Automatically: type="email", maxLength={255}
 * ```
 *
 * @example In primitive array (no name)
 * ```tsx
 * <Form.Group.List name="tags">
 *   <Form.Field.String placeholder="Tag" />
 * </Form.Group.List>
 * ```
 */
/**
 * Automatic inputMode based on field type for mobile keyboards
 */
function getInputModeFromType(type: string): StringFieldProps['inputMode'] {
  switch (type) {
    case 'email':
      return 'email'
    case 'tel':
      return 'tel'
    case 'url':
      return 'url'
    default:
      return 'text'
  }
}

export const FieldString = createField<StringFieldProps, string>({
  displayName: 'FieldString',
  render: ({ field, fullPath, resolved, hasError, errorMessage, isValidating, componentProps }): ReactElement => {
    const { constraints } = resolved

    // Props take priority over constraints
    const type = componentProps.type ?? constraints.string?.inputType ?? 'text'
    const maxLength = componentProps.maxLength ?? constraints.string?.maxLength
    const minLength = componentProps.minLength ?? constraints.string?.minLength
    const pattern = componentProps.pattern ?? constraints.string?.pattern
    // inputMode: explicit prop > auto from type
    const inputMode = componentProps.inputMode ?? getInputModeFromType(type)

    return (
      <FieldWrapper
        resolved={resolved}
        hasError={hasError}
        errorMessage={errorMessage}
        isValidating={isValidating}
        fullPath={fullPath}
      >
        <Input
          type={type}
          inputMode={inputMode}
          value={(field.state.value as string) ?? ''}
          onChange={(e) => field.handleChange((e.target as HTMLInputElement).value)}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          autoComplete={componentProps.autoComplete ?? resolved.autocomplete}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})
