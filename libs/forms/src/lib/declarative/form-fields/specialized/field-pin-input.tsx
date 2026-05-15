'use client'

import { PinInput } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Props for PinInput field
 */
export interface PinInputFieldProps extends BaseFieldProps {
  /** Number of input boxes (default: 4) */
  count?: number
  /** Mask as password */
  mask?: boolean
  /** Enable OTP autofill */
  otp?: boolean
  /** Type input: numeric, alphanumeric, alphabetic (by default: numeric) */
  type?: 'numeric' | 'alphanumeric' | 'alphabetic'
  /** Size: 2xs, xs, sm, md, lg, xl, 2xl (by default: md) */
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Variant: outline, subtle, flushed (default: outline) */
  variant?: 'outline' | 'subtle' | 'flushed'
  /** Attach inputs together (no gap) */
  attached?: boolean
  /** Callback when all fields are filled */
  onComplete?: (value: string) => void
}

/**
 * Form.Field.PinInput - PIN/OTP code input field
 *
 * Renders a series of single-character inputs for PIN codes, OTP etc.
 * Form value is stored as a string (e.g., "1234").
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.PinInput name="pin" label="Enter PIN" />
 * ```
 *
 * @example OTP with 6 digits
 * ```tsx
 * <Form.Field.PinInput
 *   name="otp"
 *   label="Confirmation Code"
 *   count={6}
 *   otp
 *   onComplete={(code) => verifyCode(code)}
 * />
 * ```
 *
 * @example Masked as password
 * ```tsx
 * <Form.Field.PinInput name="secret" mask count={6} />
 * ```
 */
export const FieldPinInput = createField<PinInputFieldProps, string>({
  displayName: 'FieldPinInput',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      count = 4,
      mask,
      otp,
      type = 'numeric',
      size = 'md',
      variant = 'outline',
      attached,
      onComplete,
    } = componentProps

    // Convert string to array for PinInput
    const stringValue = (field.state.value as string) ?? ''
    const arrayValue = stringValue.split('').slice(0, count)
    // Pad with empty strings up to count
    while (arrayValue.length < count) {
      arrayValue.push('')
    }

    const handleValueChange = (details: { value: string[] }) => {
      // Convert array back to string
      const newValue = details.value.join('')
      field.handleChange(newValue)
    }

    const handleValueComplete = (details: { value: string[] }) => {
      const completeValue = details.value.join('')
      onComplete?.(completeValue)
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <PinInput.Root
          value={arrayValue}
          onValueChange={handleValueChange}
          onValueComplete={handleValueComplete}
          placeholder={resolved.placeholder}
          mask={mask}
          otp={otp}
          type={type}
          size={size}
          variant={variant}
          attached={attached}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          invalid={hasError}
          count={count}
          onBlur={field.handleBlur}
          data-field-name={fullPath}
        >
          <PinInput.HiddenInput />
          <PinInput.Control>
            {Array.from({ length: count }).map((_, index) => (
              <PinInput.Input key={index} index={index} />
            ))}
          </PinInput.Control>
        </PinInput.Root>
      </FieldWrapper>
    )
  },
})
