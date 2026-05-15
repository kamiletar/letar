'use client'

import { NumberInput } from '@chakra-ui/react'
import { type ReactElement, useMemo } from 'react'
import type { CurrencyFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.Currency - Currency input field
 *
 * Renders NumberInput with currency formatting (symbol and decimal part).
 *
 * @example Russian rubles (by default)
 * ```tsx
 * <Form.Field.Currency name="price" label="Price" />
 * ```
 *
 * @example US Dollars
 * ```tsx
 * <Form.Field.Currency name="amount" label="Amount" currency="USD" />
 * ```
 *
 * @example Euro with currency code
 * ```tsx
 * <Form.Field.Currency
 *   name="total"
 *   label="Total"
 *   currency="EUR"
 *   currencyDisplay="code"
 * />
 * ```
 */
/** Currency field state */
interface CurrencyFieldState {
  /** Memoized format options */
  formatOptions: Intl.NumberFormatOptions
}

export const FieldCurrency = createField<CurrencyFieldProps, number | undefined, CurrencyFieldState>({
  displayName: 'FieldCurrency',

  useFieldState: (props) => {
    const { currency = 'RUB', currencyDisplay = 'symbol', decimalScale = 2 } = props

    // Memoize formatOptions at component top level
    const formatOptions = useMemo(
      () => ({
        style: 'currency' as const,
        currency,
        currencyDisplay,
        minimumFractionDigits: decimalScale,
        maximumFractionDigits: decimalScale,
      }),
      [currency, currencyDisplay, decimalScale]
    )

    return { formatOptions }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const value = field.state.value as number | undefined

    const { min, max, step = 0.01, size } = componentProps

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
