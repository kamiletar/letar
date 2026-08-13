import type { UIKitNativeSelectProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { h, type VNode } from 'vue'

export function NativeSelect(
  { value, onChange, onBlur, options, placeholder, disabled, ...rest }: UIKitNativeSelectProps,
): VNode {
  return h(
    'select',
    {
      'data-slot': 'native-select',
      value: value ?? '',
      onChange: (event: Event) => onChange((event.target as HTMLSelectElement).value),
      onBlur,
      disabled,
      'data-field-name': rest['data-field-name'],
      class: cn(
        'border-input flex h-9 w-full items-center rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
      ),
    },
    [
      placeholder ? h('option', { value: '', disabled: true }, placeholder) : null,
      ...options.map((opt) => h('option', { key: opt.value, value: opt.value, disabled: opt.disabled }, opt.label)),
    ],
  )
}
