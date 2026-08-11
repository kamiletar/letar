import type { UIKitComboboxProps } from '@letar/forms-core/uikit'
import { Check } from 'lucide-vue-next'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui'
import { h, type VNode } from 'vue'
import { cn } from '../../utils/cn'
import type { UINode } from '../ui-node'
import { NATIVE_INPUT_CLASS } from './native-input-class'

export function Combobox(
  { value, inputValue, onInputChange, onValueChange, options, loading, placeholder, disabled, ...rest }:
    UIKitComboboxProps<UINode>,
): VNode {
  return h(
    ComboboxRoot,
    {
      modelValue: value,
      'onUpdate:modelValue':
        ((next: unknown) => onValueChange(next === null || next === undefined ? undefined : String(next))) as (
          value: unknown,
        ) => void,
      disabled,
    },
    {
      default: () => [
        h(ComboboxAnchor, { class: 'relative' }, {
          default: () =>
            h(ComboboxInput, {
              'data-slot': 'combobox-input',
              'data-field-name': rest['data-field-name'],
              modelValue: inputValue,
              'onUpdate:modelValue': (next: string) => onInputChange(next),
              placeholder,
              class: cn(NATIVE_INPUT_CLASS),
            }),
        }),
        h(ComboboxPortal, {}, {
          default: () =>
            h(
              ComboboxContent,
              {
                'data-slot': 'combobox-content',
                position: 'popper',
                class: cn(
                  'bg-popover text-popover-foreground relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md',
                ),
              },
              {
                default: () => [
                  loading
                    ? h('div', { class: 'text-muted-foreground p-2 text-sm' }, 'Загрузка…')
                    : h(ComboboxEmpty, { class: 'text-muted-foreground p-2 text-sm' }, {
                      default: () => 'Ничего не найдено',
                    }),
                  h(
                    ComboboxViewport,
                    { class: 'p-1' },
                    {
                      default: () =>
                        options.map((opt) =>
                          h(
                            ComboboxItem,
                            {
                              key: opt.value,
                              value: opt.value,
                              disabled: opt.disabled,
                              class: cn(
                                'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                                'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                              ),
                            },
                            {
                              default: () => [
                                opt.label,
                                h(
                                  ComboboxItemIndicator,
                                  { class: 'absolute right-2 flex size-3.5 items-center justify-center' },
                                  { default: () => h(Check, { class: 'size-4' }) },
                                ),
                              ],
                            },
                          )
                        ),
                    },
                  ),
                ],
              },
            ),
        }),
      ],
    },
  )
}
