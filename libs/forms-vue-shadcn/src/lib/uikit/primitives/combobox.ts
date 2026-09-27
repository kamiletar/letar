import {
  getOptionDescriptionText,
  getOptionText,
  type UIKitComboboxProps,
  type UIKitOptionRenderState,
  type UIKitSelectOption,
} from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
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
import type { UINode } from '../ui-node'

/**
 * Расширение контракта `UIKitComboboxProps` — своя, не заведённая в `forms-core`, часть: у Reka
 * Combobox нет отдельного «триггера» (как у Select) — подпись выбранного значения рисуется прямо
 * в поле ввода через нативный `displayValue` примитива Reka (см. `ComboboxInput.vue`:
 * `resetSearchTerm()` без `displayValue` подставляет туда сырое `value`, а не текст опции). Тот
 * же приём, что `ShadcnComboboxExtraProps` в React-скине (`forms-shadcn/uikit/primitives/combobox.tsx`).
 */
export interface RekaComboboxExtraProps<TNode = unknown, TData = unknown> {
  /** Свой текст поля ввода для выбранного значения; пустой результат — текст опции (`textValue`/`label`) */
  renderValue?: (option: UIKitSelectOption<TNode, TData>) => string
  /**
   * Резервный поиск опции для подписи поля ввода, когда её нет в `options` — записи `loadSelected`
   * (Stage 4b) намеренно не попадают в сам список (сервер их не выдавал), но подпись показать нужно
   */
  resolveOption?: (value: string) => UIKitSelectOption<TNode, TData> | undefined
  /** Ошибка `loadOptions` (Stage 4b) — вместо пустого списка показывает сообщение и кнопку повтора */
  loadError?: unknown
  onRetryLoad?: () => void
  /** Строки индикатора загрузки/ошибки/повтора — по умолчанию русский текст без i18n-провайдера */
  loadingText?: string
  loadErrorText?: string
  retryText?: string
}

export function Combobox(
  {
    value,
    inputValue,
    onInputChange,
    onValueChange,
    options,
    renderOption,
    renderValue,
    resolveOption,
    loadError,
    onRetryLoad,
    loadingText = 'Загрузка…',
    loadErrorText = 'Не удалось загрузить',
    retryText = 'Повторить',
    loading,
    placeholder,
    disabled,
    onOpenChange,
    ...rest
  }: UIKitComboboxProps<UINode> & RekaComboboxExtraProps<UINode>,
): VNode {
  // Reka вызывает это при закрытии/блюре и на смену `modelValue` (см. `resetSearchTerm` в
  // `ComboboxInput.vue`) — сюда приходит уже подмодельное `value`, не наша опция
  const displayValue = (rootValue: unknown): string => {
    if (rootValue === undefined || rootValue === null || rootValue === '') {
      return ''
    }
    const raw = String(rootValue)
    const option = options.find((opt) => opt.value === raw) ?? resolveOption?.(raw)
    if (!option) {
      return raw
    }
    const custom = renderValue?.(option)
    return custom || getOptionText(option)
  }

  return h(
    ComboboxRoot,
    {
      modelValue: value,
      'onUpdate:modelValue':
        ((next: unknown) => onValueChange(next === null || next === undefined ? undefined : String(next))) as (
          value: unknown,
        ) => void,
      'onUpdate:open': onOpenChange,
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
              displayValue,
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
                    ? h('div', { class: 'text-muted-foreground p-2 text-sm' }, loadingText)
                    : loadError
                    ? h('div', { class: 'text-muted-foreground flex items-center gap-2 p-2 text-sm' }, [
                      loadErrorText,
                      h(
                        'button',
                        {
                          type: 'button',
                          class: 'text-foreground underline underline-offset-2',
                          onClick: onRetryLoad,
                        },
                        retryText,
                      ),
                    ])
                    : h(ComboboxEmpty, { class: 'text-muted-foreground p-2 text-sm' }, {
                      default: () => 'Ничего не найдено',
                    }),
                  h(
                    ComboboxViewport,
                    { class: 'p-1' },
                    {
                      default: () =>
                        options.map((opt) => {
                          const state: UIKitOptionRenderState = {
                            selected: opt.value === value,
                            disabled: opt.disabled ?? false,
                            pending: opt.pending ?? false,
                          }
                          const optionContent = renderOption ? renderOption(opt, state) : opt.label
                          // Вторая строка — только без своего `renderOption` (как в React-скине и в `select.ts`):
                          // со своим рендерером пункт рисует приложение целиком
                          const descriptionText = getOptionDescriptionText(opt)
                          const content = !renderOption && descriptionText !== ''
                            ? h('div', { class: 'flex min-w-0 flex-1 flex-col' }, [
                              optionContent,
                              h(
                                'span',
                                { 'data-slot': 'combobox-item-description', class: 'text-muted-foreground text-xs' },
                                descriptionText,
                              ),
                            ])
                            : optionContent

                          return h(
                            ComboboxItem,
                            {
                              key: opt.value,
                              value: opt.value,
                              disabled: opt.disabled,
                              'data-slot': 'combobox-item',
                              class: cn(
                                'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                                'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                              ),
                            },
                            {
                              default: () => [
                                content,
                                h(
                                  ComboboxItemIndicator,
                                  { class: 'absolute right-2 flex size-3.5 items-center justify-center' },
                                  { default: () => h(Check, { class: 'size-4' }) },
                                ),
                              ],
                            },
                          )
                        }),
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
