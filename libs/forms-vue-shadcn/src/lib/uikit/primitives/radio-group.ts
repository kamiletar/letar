import type { UIKitRadioGroupProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { Circle } from 'lucide-vue-next'
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { h, type VNode } from 'vue'
import type { UINode } from '../ui-node'

export function RadioGroup(
  { value, onValueChange, options, disabled, ...rest }: UIKitRadioGroupProps<UINode>,
): VNode {
  return h(
    RadioGroupRoot,
    {
      'data-slot': 'radio-group',
      modelValue: value,
      'onUpdate:modelValue': ((next: unknown) => onValueChange(String(next))) as (value: unknown) => void,
      disabled,
      'data-field-name': rest['data-field-name'],
      class: 'flex flex-col gap-2',
    },
    {
      default: () =>
        options.map((opt) =>
          h('label', { key: opt.value, class: 'flex items-center gap-2 text-sm' }, [
            h(
              RadioGroupItem,
              {
                value: opt.value,
                disabled: opt.disabled,
                class: cn(
                  'border-input text-primary aspect-square size-4 shrink-0 rounded-full border shadow-xs outline-none',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                ),
              },
              {
                default: () =>
                  h(
                    RadioGroupIndicator,
                    { class: 'flex items-center justify-center' },
                    { default: () => h(Circle, { class: 'fill-primary size-2' }) },
                  ),
              },
            ),
            opt.label,
          ])
        ),
    },
  )
}
