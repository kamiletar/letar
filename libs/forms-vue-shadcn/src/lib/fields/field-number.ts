import { createField, FieldWrapper } from '../uikit/primitives'
import { NumberInput } from '../uikit/primitives/number-input'

export const FieldNumber = createField(
  'FieldNumber',
  ({ field, name, label, required, hasError, errorMessage }) =>
    FieldWrapper({
      label,
      required,
      hasError,
      errorMessage,
      children: NumberInput({
        value: (field.state.value as number | null) ?? null,
        onChange: (value) => field.handleChange(value),
        onBlur: field.handleBlur,
        'data-field-name': name,
      }),
    }),
)
