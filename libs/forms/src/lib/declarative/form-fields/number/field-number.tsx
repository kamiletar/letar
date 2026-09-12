'use client'

import { NumberInput } from '@chakra-ui/react'
import { useFormI18n } from '@letar/forms-react'
import { type ReactElement, useMemo } from 'react'
import type { NumberFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.Number - Number input field
 *
 * Renders a Chakra NumberInput with automatic form integration and error display.
 *
 * Automatically extracts from Zod schema:
 * - `min` from `z.number().min(1)` → min={1}
 * - `max` from `z.number().max(100)` → max={100}
 * - `step` from `z.number().int()` → step={1}, or `z.number().multipleOf(0.5)` → step={0.5}
 * - `helperText` automatically generated from constraints ("From 1 to 100")
 *
 * Props always take priority over automatic values from schema.
 *
 * @example
 * ```tsx
 * <Form.Field.Number name="portions" label="Portions" />
 * // With z.number().min(1).max(100) automatically: min={1} max={100} helperText="From 1 to 100"
 * ```
 */
interface NumberFieldState {
  /** BCP-47 locale для парсинга/форматирования — из `FormI18nProvider`, влияет на десятичный разделитель */
  locale: string | undefined
  /**
   * zag-js `parseValue`/`formatValue` парсят `parseFloat`/`value.toString()` (игнорируя `locale`
   * целиком), пока `formatOptions` не задан — см. `@zag-js/number-input` `number-input.utils`.
   * Без явного объекта здесь запятая как десятичный разделитель (RU-локаль) не распознаётся вообще,
   * даже с корректным `locale`. `useGrouping: false` + `maximumFractionDigits: 20` воспроизводят
   * прежний вид без forma­tOptions (как `value.toString()`) для en/без i18n, включая локаль-зависимый
   * разделитель для остальных языков.
   */
  formatOptions: Intl.NumberFormatOptions
}

export const FieldNumber = createField<NumberFieldProps, number | undefined, NumberFieldState>({
  displayName: 'FieldNumber',

  useFieldState: () => {
    const locale = useFormI18n()?.locale
    const formatOptions = useMemo<Intl.NumberFormatOptions>(
      () => ({ useGrouping: false, maximumFractionDigits: 20 }),
      [],
    )
    return { locale, formatOptions }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const value = field.state.value as number | undefined
    const { constraints } = resolved

    // Props take priority over constraints
    const min = componentProps.min ?? constraints.number?.min
    const max = componentProps.max ?? constraints.number?.max
    const step = componentProps.step ?? constraints.number?.step

    // For optional fields do not pass min/max to NumberInput when value is empty,
    // otherwise Chakra will show invalid state for empty value
    const isOptional = resolved.required === false
    const isEmpty = value === undefined || value === null
    const shouldApplyMinMax = !isOptional || !isEmpty

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <NumberInput.Root
          value={value?.toString() ?? ''}
          onValueChange={(details: { valueAsNumber: number }) => {
            const num = details.valueAsNumber
            field.handleChange(Number.isNaN(num) ? undefined : num)
          }}
          onBlur={field.handleBlur}
          min={shouldApplyMinMax ? min : undefined}
          max={shouldApplyMinMax ? max : undefined}
          step={step}
          locale={fieldState.locale}
          formatOptions={fieldState.formatOptions}
          size={componentProps.size}
        >
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
          <NumberInput.Input
            placeholder={resolved.placeholder}
            data-field-name={fullPath}
            inputMode="decimal"
            onFocus={(e) => e.currentTarget.select()}
          />
        </NumberInput.Root>
      </FieldWrapper>
    )
  },
})
