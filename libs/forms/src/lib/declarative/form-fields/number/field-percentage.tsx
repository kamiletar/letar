'use client'

import { NumberInput } from '@chakra-ui/react'
import { useFormI18n } from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import { type ReactElement, useMemo } from 'react'
import type { PercentageFieldProps } from '../../types'
import { createField, FieldWrapper, useUncontrolledNumberSync } from '../base'

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
 *
 * @example Значение хранится в базисных пунктах (целое число), отображается/редактируется в %
 * ```tsx
 * <Form.Field.Percentage name="annualRateBps" label="Ставка" minorUnitScale={100} />
 * ```
 */
/** Percentage field state */
interface PercentageFieldState {
  /** Memoized format options */
  formatOptions: Intl.NumberFormatOptions
  /** BCP-47 locale для парсинга/форматирования — из `FormI18nProvider`, влияет на десятичный разделитель */
  locale: string | undefined
  /** major units, вычисленные из хранимого значения (см. minorUnitScale) */
  displayedValue: number | undefined
  /** См. `useUncontrolledNumberSync` — обход бага контролируемого NumberInput.Root */
  resetKey: number
  markInternalChange: (value: number | undefined) => void
}

export const FieldPercentage = createField<PercentageFieldProps, number | undefined, PercentageFieldState>({
  displayName: 'FieldPercentage',

  useFieldState: (props, _resolved, { form, fullPath }) => {
    const { decimalScale = 0, minorUnitScale = 1 } = props
    const locale = useFormI18n()?.locale

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
      [decimalScale],
    )

    // Форма хранит/сериализует значение в minor units (базисные пункты), поле показывает/принимает
    // major units (%) — тот же принцип value-transform, что у Form.Field.Currency.
    const storedValue = useStore(form.store, () => form.getFieldValue(fullPath)) as number | undefined
    const displayedValue = storedValue === undefined ? undefined : storedValue / minorUnitScale
    const { resetKey, markInternalChange } = useUncontrolledNumberSync(displayedValue)

    return { formatOptions, locale, displayedValue, resetKey, markInternalChange }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { min = 0, max = 100, step = 1, size, minorUnitScale = 1 } = componentProps

    const { formatOptions, locale, displayedValue, resetKey, markInternalChange } = fieldState

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <NumberInput.Root
          key={resetKey}
          defaultValue={displayedValue?.toString() ?? ''}
          onValueChange={(details: { valueAsNumber: number }) => {
            const num = details.valueAsNumber
            markInternalChange(Number.isNaN(num) ? undefined : num)
            if (Number.isNaN(num)) {
              field.handleChange(undefined)
              return
            }
            // scale=1 (по умолчанию) сохраняет исходное поведение как есть — Math.round здесь
            // только для scale!=1, где `num * minorUnitScale` рискует накопить погрешность
            // плавающей точки.
            field.handleChange(minorUnitScale === 1 ? num : Math.round(num * minorUnitScale))
          }}
          onBlur={field.handleBlur}
          min={min}
          max={max}
          step={step}
          formatOptions={formatOptions}
          locale={locale}
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
