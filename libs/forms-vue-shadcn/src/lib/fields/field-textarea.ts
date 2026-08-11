import { h } from 'vue'
import { createField, FieldWrapper } from '../uikit/primitives'
import { NATIVE_INPUT_CLASS } from '../uikit/primitives/native-input-class'
import { cn } from '../utils/cn'

/**
 * Нативный `<textarea>` — как и в React-скине, многострочный текст не входит в core-контракт
 * UIKit (см. `field-string.ts` для сравнения с `Input`, который в контракте есть).
 */
export const FieldTextarea = createField(
  'FieldTextarea',
  ({ field, name, label, placeholder, required, hasError, errorMessage }) =>
    FieldWrapper({
      label,
      required,
      hasError,
      errorMessage,
      children: h('textarea', {
        'data-slot': 'textarea',
        value: (field.state.value as string) ?? '',
        onInput: (e: Event) => field.handleChange((e.target as HTMLTextAreaElement).value),
        onBlur: field.handleBlur,
        placeholder,
        rows: 3,
        'data-field-name': name,
        class: cn(
          NATIVE_INPUT_CLASS.replace('h-9', 'min-h-16'),
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        ),
      }),
    }),
)
