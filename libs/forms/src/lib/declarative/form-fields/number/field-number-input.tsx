'use client'

import { NumberInput } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { NumberInputFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.NumberInput - Number field with extended options
 *
 * Extends base Number field with formatting, mouse wheel support, etc.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.NumberInput name="quantity" label="Quantity" min={1} max={100} />
 * ```
 *
 * @example With currency formatting
 * ```tsx
 * <Form.Field.NumberInput
 *   name="price"
 *   label="Price"
 *   formatOptions={{ style: 'currency', currency: 'RUB' }}
 * />
 * ```
 *
 * @example With mouse wheel
 * ```tsx
 * <Form.Field.NumberInput name="count" allowMouseWheel />
 * ```
 */
export const FieldNumberInput = createField<NumberInputFieldProps, number | undefined>({
  displayName: 'FieldNumberInput',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const value = field.state.value as number | undefined

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <NumberInput.Root
          value={value?.toString() ?? ''}
          onValueChange={(details: { valueAsNumber: number }) => {
            const num = details.valueAsNumber
            field.handleChange(Number.isNaN(num) ? undefined : num)
          }}
          onBlur={field.handleBlur}
          min={componentProps.min}
          max={componentProps.max}
          step={componentProps.step}
          formatOptions={componentProps.formatOptions}
          allowMouseWheel={componentProps.allowMouseWheel}
          clampValueOnBlur={componentProps.clampValueOnBlur ?? true}
          spinOnPress={componentProps.spinOnPress ?? true}
          size={componentProps.size}
        >
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
          <NumberInput.Input placeholder={resolved.placeholder} data-field-name={fullPath} inputMode="decimal" />
        </NumberInput.Root>
      </FieldWrapper>
    )
  },
})
