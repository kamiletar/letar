import type { UIKitNumberInputProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { h, type VNode } from 'vue'

export function NumberInput(
  { value, onChange, onBlur, min, max, step, disabled, readOnly, ...rest }: UIKitNumberInputProps,
): VNode {
  return h('input', {
    'data-slot': 'number-input',
    type: 'number',
    value: value ?? '',
    onInput: (e: Event) => {
      const raw = (e.target as HTMLInputElement).value
      onChange(raw === '' ? null : Number(raw))
    },
    onBlur,
    min,
    max,
    step,
    disabled,
    readonly: readOnly,
    'data-field-name': rest['data-field-name'],
    class: cn(NATIVE_INPUT_CLASS),
  })
}
