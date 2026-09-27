import {
  getOptionDescriptionText,
  getOptionText,
  type UIKitOptionRenderState,
  type UIKitSelectProps,
} from '@letar/forms-core/uikit'
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
  {
    value,
    onValueChange,
    onBlur,
    options,
    renderOption,
    renderValue,
    label,
    placeholder,
    disabled,
    clearable,
    ...rest
  }: UIKitSelectProps<UINode>,
): VNode {
  // Подпись триггера: своя (`renderValue`), пустой результат откатывается на текст опции — тот же
  // контракт, что и в React-скине (`resolveSelectValue`), без `loading`/`showUnknownValue` (вне Stage 3a)
  const selectedOption = value !== undefined ? options.find((opt) => opt.value === value) : undefined
  const customValue = selectedOption && renderValue ? renderValue(selectedOption) : undefined
  const hasCustomValue = customValue !== undefined && customValue !== null && customValue !== ''
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
              h(
                SelectValue,
                { placeholder },
                selectedOption && renderValue
                  ? { default: () => (hasCustomValue ? customValue : getOptionText(selectedOption)) }
                  : undefined,
              ),
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
                        options.map((opt) => {
                          const state: UIKitOptionRenderState = {
                            selected: opt.value === value,
                            disabled: opt.disabled ?? false,
                            // Ожидание сервера (`pending`) — вне Stage 3a, опция никогда не в ожидании
                            pending: false,
                          }
                          const itemText = h(
                            SelectItemText,
                            {},
                            { default: () => (renderOption ? renderOption(opt, state) : opt.label) },
                          )
                          // Вторая строка — сосед `ItemText`, как в React-скине; со своим `renderOption`
                          // пункт рисует приложение целиком, второй строки от примитива нет.
                          // `getOptionDescriptionText` уже сузила описание до строки (или `''`) —
                          // `h()` не принимает `null`/`VNode` третьим аргументом как обычный текст
                          const descriptionText = getOptionDescriptionText(opt)
                          const content = !renderOption && descriptionText !== ''
                            ? h('div', { class: 'flex min-w-0 flex-1 flex-col' }, [
                              itemText,
                              h(
                                'span',
                                { 'data-slot': 'select-item-description', class: 'text-muted-foreground text-xs' },
                                descriptionText,
                              ),
                            ])
                            : itemText

                          return h(
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
                                content,
                                h(
                                  SelectItemIndicator,
                                  { class: 'absolute right-2 flex size-3.5 items-center justify-center' },
                                  { default: () => h(Check, { class: 'size-4' }) },
                                ),
                              ],
                            },
                          )
                        }),
                    },
                  ),
              },
            ),
        }),
      ],
    },
  )
}
