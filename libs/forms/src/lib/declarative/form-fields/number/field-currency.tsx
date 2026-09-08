'use client'

import { NumberInput } from '@chakra-ui/react'
import { useFormI18n } from '@letar/forms-react'
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
}

export const FieldCurrency = createField<CurrencyFieldProps, number | undefined, CurrencyFieldState>({
  displayName: 'FieldCurrency',

  useFieldState: (props) => {
    const { currency = 'RUB', currencyDisplay = 'symbol', decimalScale = 2 } = props
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

    return { formatOptions, locale }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const storedValue = field.state.value as number | undefined

    const { min, max, step = 0.01, size, minorUnitScale = 1 } = componentProps

    const { formatOptions, locale } = fieldState

    // Форма хранит/сериализует значение в minor units (копейки), поле показывает/принимает major
    // units (рубли) — тот же принцип value-transform, что у Form.Field.Slug (вычисляемое значение
    // поверх обычного поля), но в обе стороны и без промежуточного локального состояния.
    const displayedValue = storedValue === undefined ? undefined : storedValue / minorUnitScale

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <NumberInput.Root
          value={displayedValue?.toString() ?? ''}
          onValueChange={(details: { valueAsNumber: number }) => {
            const num = details.valueAsNumber
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
