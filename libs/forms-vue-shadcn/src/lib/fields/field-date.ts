import { createField, FieldWrapper } from '../uikit/primitives'
import { Input } from '../uikit/primitives/input'

export const FieldDate = createField(
  'FieldDate',
  ({ field, name, label, required, hasError, errorMessage }) => {
    const rawValue = field.state.value
    const value = rawValue instanceof Date ? rawValue.toISOString().split('T')[0] : (rawValue as string) ?? ''

    return FieldWrapper({
      label,
      required,
      hasError,
      errorMessage,
      children: Input({
        type: 'date',
        value,
        onChange: (v) => field.handleChange(v),
        onBlur: field.handleBlur,
        'data-field-name': name,
      }),
    })
  },
)
