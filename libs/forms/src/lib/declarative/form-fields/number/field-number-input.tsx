'use client'

import { NumberInput } from '@chakra-ui/react'
import { useFormI18n } from '@letar/forms-react'
import type { ReactElement } from 'react'
import type { NumberInputFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * zag-js `parseValue`/`formatValue` парсят `parseFloat`/`value.toString()` (игнорируя `locale`
 * целиком), пока `formatOptions` не задан — см. `@zag-js/number-input` `number-input.utils`. Без
 * явного объекта запятая как десятичный разделитель (RU-локаль) не распознаётся вообще, даже с
 * корректным `locale`. `useGrouping: false` + `maximumFractionDigits: 20` воспроизводят прежний
 * вид без formatOptions (как `value.toString()`) для en/без i18n — применяется только когда сам
 * потребитель не задал `formatOptions` явно (иначе перебьёт его выбор группировки/стиля).
 */
const DEFAULT_FORMAT_OPTIONS: Intl.NumberFormatOptions = { useGrouping: false, maximumFractionDigits: 20 }

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
interface NumberInputFieldState {
  /** BCP-47 locale для парсинга/форматирования — из `FormI18nProvider`, влияет на десятичный разделитель */
  locale: string | undefined
}

export const FieldNumberInput = createField<NumberInputFieldProps, number | undefined, NumberInputFieldState>({
  displayName: 'FieldNumberInput',

  useFieldState: () => ({ locale: useFormI18n()?.locale }),

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const value = field.state.value as number | undefined
    const formatOptions = componentProps.formatOptions ?? DEFAULT_FORMAT_OPTIONS

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
          formatOptions={formatOptions}
          locale={fieldState.locale}
          allowMouseWheel={componentProps.allowMouseWheel}
          clampValueOnBlur={componentProps.clampValueOnBlur ?? true}
          spinOnPress={componentProps.spinOnPress ?? true}
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
