import { createField, FieldWrapper } from '../uikit/primitives'
import { NumberInput } from '../uikit/primitives/number-input'

/** Значение хранится как есть (50 = 50%), не как доля (0.5). */
export const FieldPercentage = createField(
  'FieldPercentage',
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
        min: 0,
        max: 100,
        step: 1,
        'data-field-name': name,
      }),
    }),
)
