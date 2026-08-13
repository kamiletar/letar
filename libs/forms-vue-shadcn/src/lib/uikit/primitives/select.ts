import type { UIKitSelectProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { Check, ChevronDown, X } from 'lucide-vue-next'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { h, type VNode } from 'vue'
import type { UINode } from '../ui-node'

export function Select(
  { value, onValueChange, onBlur, options, label, placeholder, disabled, clearable, ...rest }: UIKitSelectProps<
    UINode
  >,
): VNode {
  return h(
    SelectRoot,
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
        label ? h('span', { class: 'mb-2 block text-sm leading-none font-medium' }, label) : null,
        h(
          SelectTrigger,
          {
            'data-slot': 'select-trigger',
            onBlur,
            'data-field-name': rest['data-field-name'],
            class: cn(
              'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'data-[placeholder]:text-muted-foreground',
            ),
          },
          {
            default: () => [
              h(SelectValue, { placeholder }),
              h(SelectIcon, { asChild: true }, {
                default: () =>
                  clearable && value
                    ? h(
                      'span',
                      {
                        role: 'button',
                        tabindex: -1,
                        onClick: (e: MouseEvent) => {
                          e.stopPropagation()
                          onValueChange(undefined)
                        },
                      },
                      h(X, { class: 'size-4 opacity-50' }),
                    )
                    : h(ChevronDown, { class: 'size-4 opacity-50' }),
              }),
            ],
          },
        ),
        h(SelectPortal, {}, {
          default: () =>
            h(
              SelectContent,
              {
                'data-slot': 'select-content',
                position: 'popper',
                class: cn(
                  'bg-popover text-popover-foreground relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md',
                  'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
                ),
              },
              {
                default: () =>
                  h(
                    SelectViewport,
                    { class: 'p-1' },
                    {
                      default: () =>
                        options.map((opt) =>
                          h(
                            SelectItem,
                            {
                              key: opt.value,
                              value: opt.value,
                              disabled: opt.disabled,
                              class: cn(
                                'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                                'focus:bg-accent focus:text-accent-foreground',
                                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                              ),
                            },
                            {
                              default: () => [
                                h(SelectItemText, {}, { default: () => opt.label }),
                                h(
                                  SelectItemIndicator,
                                  { class: 'absolute right-2 flex size-3.5 items-center justify-center' },
                                  { default: () => h(Check, { class: 'size-4' }) },
                                ),
                              ],
                            },
                          )
                        ),
                    },
                  ),
              },
            ),
        }),
      ],
    },
  )
}
