import { createField, FieldWrapper } from '../uikit/primitives'
import { Input } from '../uikit/primitives/input'

export const FieldString = createField(
  'FieldString',
  ({ field, name, label, placeholder, required, hasError, errorMessage }) =>
    FieldWrapper({
      label,
      required,
      hasError,
      errorMessage,
      children: Input({
        value: (field.state.value as string) ?? '',
        onChange: (value) => field.handleChange(value),
        onBlur: field.handleBlur,
        placeholder,
        'data-field-name': name,
      }),
    }),
)
