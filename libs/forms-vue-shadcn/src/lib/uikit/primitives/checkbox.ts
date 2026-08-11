import type { UIKitCheckboxProps } from '@letar/forms-core/uikit'
import { Check } from 'lucide-vue-next'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { h, type VNode } from 'vue'
import { cn } from '../../utils/cn'
import type { UINode } from '../ui-node'

export function Checkbox(
  { checked, onCheckedChange, onBlur, disabled, readOnly, label, ...rest }: UIKitCheckboxProps<UINode>,
): VNode {
  return h('label', { class: 'flex items-center gap-2' }, [
    h(
      CheckboxRoot,
      {
        'data-slot': 'checkbox',
        modelValue: checked,
        'onUpdate:modelValue': ((state: unknown) => onCheckedChange(state === true)) as (value: unknown) => void,
        onBlur,
        disabled: disabled || readOnly,
        'data-field-name': rest['data-field-name'],
        class: cn(
          'border-input peer size-4 shrink-0 rounded-[4px] border shadow-xs outline-none transition-shadow',
          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
          'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ),
      },
      {
        default: () =>
          h(CheckboxIndicator, { class: 'flex items-center justify-center text-current' }, {
            default: () => h(Check, { class: 'size-3.5' }),
          }),
      },
    ),
    label ? h('span', { class: 'text-sm' }, label) : null,
  ])
}
