import type { UIKitInputProps } from '@letar/forms-core/uikit'
import { h, type VNode } from 'vue'
import { cn } from '../../utils/cn'
import { NATIVE_INPUT_CLASS } from './native-input-class'

export function Input({
  value,
  onChange,
  onBlur,
  type,
  inputMode,
  placeholder,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  disabled,
  readOnly,
  ...rest
}: UIKitInputProps): VNode {
  return h('input', {
    'data-slot': 'input',
    value,
    onInput: (e: Event) => onChange((e.target as HTMLInputElement).value),
    onBlur,
    type,
    inputmode: inputMode,
    placeholder,
    maxlength: maxLength,
    minlength: minLength,
    pattern,
    autocomplete: autoComplete,
    disabled,
    readonly: readOnly,
    'data-field-name': rest['data-field-name'],
    class: cn(NATIVE_INPUT_CLASS, 'aria-invalid:border-destructive aria-invalid:ring-destructive/20'),
  })
}
