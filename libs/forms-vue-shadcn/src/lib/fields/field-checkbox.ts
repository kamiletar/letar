import { createField, FieldWrapper } from '../uikit/primitives'
import { Checkbox } from '../uikit/primitives/checkbox'

/** Своя разметка (флажок слева от подписи), как и в React-скине — не через `FieldWrapper` с отдельной меткой. */
export const FieldCheckbox = createField(
  'FieldCheckbox',
  ({ field, name, label, hasError, errorMessage }) =>
    FieldWrapper({
      hasError,
      errorMessage,
      children: Checkbox({
        checked: !!field.state.value,
        onCheckedChange: (checked) => field.handleChange(checked),
        onBlur: field.handleBlur,
        label,
        'data-field-name': name,
      }),
    }),
)
