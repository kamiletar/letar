'use client'

import { NumberInput } from '@chakra-ui/react'
import { type ReactElement, useMemo } from 'react'
import type { PercentageFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.Percentage - Percentage input field
 *
 * Renders NumberInput with percentage formatting and % symbol.
 * Value is stored as-is (50 = 50%), not as decimal fraction (0.5).
 *
 * @example Basic usage (0-100%)
 * ```tsx
 * <Form.Field.Percentage name="discount" label="Discount" />
 * ```
 *
 * @example With custom range
 * ```tsx
 * <Form.Field.Percentage name="margin" label="Margin" min={0} max={50} />
 * ```
 *
 * @example With decimals
 * ```tsx
 * <Form.Field.Percentage name="rate" label="Rate" decimalScale={2} step={0.1} />
 * ```
 */
/** Percentage field state */
interface PercentageFieldState {
  /** Memoized format options */
  formatOptions: Intl.NumberFormatOptions
}

export const FieldPercentage = createField<PercentageFieldProps, number | undefined, PercentageFieldState>({
  displayName: 'FieldPercentage',

  useFieldState: (props) => {
    const { decimalScale = 0 } = props

    // Use 'unit' style with percent to store whole numbers (50 = 50%)
    // Chakra's 'percent' style expects decimals (0.5 = 50%)
    const formatOptions = useMemo(
      () => ({
        style: 'unit' as const,
        unit: 'percent',
        unitDisplay: 'short' as const,
        minimumFractionDigits: decimalScale,
        maximumFractionDigits: decimalScale,
      }),
      [decimalScale]
    )

    return { formatOptions }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const value = field.state.value as number | undefined

    const { min = 0, max = 100, step = 1, size } = componentProps

    const { formatOptions } = fieldState

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <NumberInput.Root
          value={value?.toString() ?? ''}
          onValueChange={(details: { valueAsNumber: number }) => {
            const num = details.valueAsNumber
            field.handleChange(Number.isNaN(num) ? undefined : num)
          }}
          onBlur={field.handleBlur}
          min={min}
          max={max}
          step={step}
          formatOptions={formatOptions}
          clampValueOnBlur
          size={size}
        >
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
          <NumberInput.Input placeholder={resolved.placeholder} data-field-name={fullPath} />
        </NumberInput.Root>
      </FieldWrapper>
    )
  },
})
