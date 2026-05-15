'use client'

import { Input } from '@chakra-ui/react'
import { type ReactElement, useCallback } from 'react'
import { withMask } from 'use-mask-input'
import type { MaskedInputFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * State for masked field
 */
interface MaskedInputFieldState {
  /** Ref callback for applying mask */
  maskRef: (element: HTMLInputElement | null) => void
}

/**
 * Form.Field.MaskedInput - Masked input field
 *
 * Renders masked input using the use-mask-input library.
 *
 * Mask characters:
 * - 9: digit
 * - a: letter
 * - *: letter or digit
 *
 * @example Passport mask
 * ```tsx
 * <Form.Field.MaskedInput name="passport" label="Passport" mask="99 99 999999" />
 * ```
 *
 * @example Multiple masks (adapts to input)
 * ```tsx
 * <Form.Field.MaskedInput name="phone" mask={['9999-9999', '99999-9999']} />
 * ```
 *
 * @example With custom placeholder character
 * ```tsx
 * <Form.Field.MaskedInput name="date" mask="99/99/9999" placeholderChar="#" />
 * ```
 */
export const FieldMaskedInput = createField<MaskedInputFieldProps, string, MaskedInputFieldState>({
  displayName: 'FieldMaskedInput',

  useFieldState: (props) => {
    const {
      mask,
      placeholderChar = '_',
      showMaskOnFocus = true,
      showMaskOnHover = false,
      clearIncomplete = false,
      autoUnmask = false,
    } = props

    // Create ref callback for applying mask
    const maskRef = useCallback(
      (element: HTMLInputElement | null) => {
        if (element && mask) {
          const maskCallback = withMask(mask, {
            placeholder: placeholderChar,
            showMaskOnFocus,
            showMaskOnHover,
            clearIncomplete,
            autoUnmask,
          })
          maskCallback(element)
        }
      },
      [mask, placeholderChar, showMaskOnFocus, showMaskOnHover, clearIncomplete, autoUnmask]
    )

    return { maskRef }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <Input
        ref={fieldState.maskRef}
        value={(field.state.value as string) ?? ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={resolved.placeholder}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
