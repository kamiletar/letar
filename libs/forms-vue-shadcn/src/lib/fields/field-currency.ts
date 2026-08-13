import { createField, FieldWrapper } from '../uikit/primitives'
import { NumberInput } from '../uikit/primitives/number-input'

/**
 * Без `Intl.NumberFormat`-форматирования — `NumberInput`-примитив рисует голый `<input
 * type="number">`, форматирование валюты (как в React-версии через `formatOptions` Chakra
 * `NumberInput`) в Reka UI-скине не реализовано.
 */
export const FieldCurrency = createField(
  'FieldCurrency',
  ({ field, name, label, required, hasError, errorMessage }) =>
    FieldWrapper({
      label,
      required,
      hasError,
      errorMessage,
      children: NumberInput({
        value: (field.state.value as number | null) ?? null,
        onChange: (value) => field.handleChange(value ?? undefined),
        onBlur: field.handleBlur,
        step: 0.01,
        'data-field-name': name,
      }),
    }),
)
