'use client'

import { Field as ChakraField } from '@chakra-ui/react'
import { forwardRef, type ReactNode } from 'react'
import { useTanStackFormField } from './tanstack-form-field'

export interface ChakraFormFieldProps extends Omit<ChakraField.RootProps, 'label' | 'invalid'> {
  /** Field label text */
  label?: ReactNode
  /** Helper text below the field */
  helperText?: ReactNode
  /** Override error text (by default uses TanStack Form errors) */
  errorText?: ReactNode
  /** Text for optional field */
  optionalText?: ReactNode
  /** Show required field indicator */
  required?: boolean
  /** Override invalid state (by default uses TanStack Form errors) */
  invalid?: boolean
  /** Children elements — the form input element itself */
  children: ReactNode
}

/**
 * ChakraFormField - Chakra UI v3 field with TanStack Form integration
 *
 * Automatically displays validation errors from TanStack Form field API.
 * Must be used inside a TanStackFormField component.
 *
 * @example
 * ```tsx
 * <form.Field name="email">
 *   {(field) => (
 *     <TanStackFormField name="email" field={field}>
 *       <ChakraFormField label="Email" helperText="Your work email" required>
 *         <Input
 *           value={field.state.value}
 *           onChange={(e) => field.handleChange(e.target.value)}
 *           onBlur={field.handleBlur}
 *         />
 *       </ChakraFormField>
 *     </TanStackFormField>
 *   )}
 * </form.Field>
 * ```
 */
export const ChakraFormField = forwardRef<HTMLDivElement, ChakraFormFieldProps>(function ChakraFormField(props, ref) {
  const { label, children, helperText, errorText, optionalText, required, invalid, ...rest } = props

  const fieldContext = useTanStackFormField()

  // Get errors from TanStack Form field
  const fieldErrors = fieldContext?.field.state.meta.errors
  const hasErrors = fieldErrors && fieldErrors.length > 0
  const isInvalid = invalid ?? hasErrors

  // Format error messages
  const errorMessages = errorText
    ?? (hasErrors
      ? fieldErrors
        .map((e: unknown) => (typeof e === 'string' ? e : ((e as { message?: string }).message ?? String(e))))
        .join(', ')
      : undefined)

  // Workaround: Chakra UI Field types do not include children in Next.js 16 production build
  const FieldLabel = ChakraField.Label as React.FC<{ children: ReactNode }>
  const FieldHelperText = ChakraField.HelperText as React.FC<{ children: ReactNode }>
  const FieldErrorText = ChakraField.ErrorText as React.FC<{ children: ReactNode }>

  return (
    <ChakraField.Root ref={ref} invalid={isInvalid} required={required} {...rest}>
      {label && (
        <FieldLabel>
          {label}
          <ChakraField.RequiredIndicator fallback={optionalText} />
        </FieldLabel>
      )}
      {children}
      {helperText && !isInvalid && <FieldHelperText>{helperText}</FieldHelperText>}
      {isInvalid && errorMessages && <FieldErrorText>{errorMessages}</FieldErrorText>}
    </ChakraField.Root>
  )
})
