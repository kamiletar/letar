'use client'

import { NumberInput } from '@chakra-ui/react'
import { useFormI18n } from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import { type ReactElement, useMemo } from 'react'
import type { CurrencyFieldProps } from '../../types'
import { createField, FieldWrapper, useUncontrolledNumberSync } from '../base'

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
 *
 * @example Значение хранится в копейках (целое число), отображается/редактируется в рублях
 * ```tsx
 * <Form.Field.Currency name="priceKopecks" label="Цена" minorUnitScale={100} />
 * ```
 */
/** Currency field state */
interface CurrencyFieldState {
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

export const FieldCurrency = createField<CurrencyFieldProps, number | undefined, CurrencyFieldState>({
  displayName: 'FieldCurrency',

  useFieldState: (props, _resolved, { form, fullPath }) => {
    const { currency = 'RUB', currencyDisplay = 'symbol', decimalScale = 2, minorUnitScale = 1 } = props
    const locale = useFormI18n()?.locale

    // Memoize formatOptions at component top level
    const formatOptions = useMemo(
      () => ({
        style: 'currency' as const,
        currency,
        currencyDisplay,
        minimumFractionDigits: decimalScale,
        maximumFractionDigits: decimalScale,
      }),
      [currency, currencyDisplay, decimalScale],
    )

    // Форма хранит/сериализует значение в minor units (копейки), поле показывает/принимает major
    // units (рубли) — тот же принцип value-transform, что у Form.Field.Slug (вычисляемое значение
    // поверх обычного поля), но в обе стороны и без промежуточного локального состояния.
    const storedValue = useStore(form.store, () => form.getFieldValue(fullPath)) as number | undefined
    const displayedValue = storedValue === undefined ? undefined : storedValue / minorUnitScale
    const { resetKey, markInternalChange } = useUncontrolledNumberSync(displayedValue)

    return { formatOptions, locale, displayedValue, resetKey, markInternalChange }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { step = 0.01, size, minorUnitScale = 1 } = componentProps
    const { constraints } = resolved

    // Props take priority over Zod-derived constraints — тот же принцип, что в Form.Field.Number.
    // Без этого падения `min`/`max` в NumberInput.Root оставались `undefined`, и zag-js подставлял
    // свой дефолт (`Number.MIN_SAFE_INTEGER`/`Number.MAX_SAFE_INTEGER`) — клавиша Home/End
    // (в zag-js «прыжок к min/max», не перемещение курсора) записывала это число прямо в поле.
    const min = componentProps.min ?? constraints.number?.min
    const max = componentProps.max ?? constraints.number?.max

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
            // плавающей точки (например `123.45 * 100 = 12345.000000000002`).
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
