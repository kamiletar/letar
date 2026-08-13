import { createField, FieldWrapper } from '../uikit/primitives'
import { Input } from '../uikit/primitives/input'

export const FieldTime = createField(
  'FieldTime',
  ({ field, name, label, required, hasError, errorMessage }) =>
    FieldWrapper({
      label,
      required,
      hasError,
      errorMessage,
      children: Input({
        type: 'time',
        value: (field.state.value as string) ?? '',
        onChange: (v) => field.handleChange(v),
        onBlur: field.handleBlur,
        'data-field-name': name,
      }),
    }),
)
