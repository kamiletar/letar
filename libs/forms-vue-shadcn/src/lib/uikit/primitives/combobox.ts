import {
  getOptionDescriptionText,
  getOptionText,
  type UIKitComboboxProps,
  type UIKitOptionRenderState,
  type UIKitSelectControl,
  type UIKitSelectOption,
} from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { Check, Loader2 } from 'lucide-vue-next'
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
import { defineComponent, h, type PropType, ref, type VNode, watchEffect } from 'vue'
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

/**
 * `Combobox` — тонкая функция-обёртка (тот же приём, что у `Select` в `select.ts`): персистентное
 * состояние (`open`, `controlRef`) не может жить в теле функции, вызываемой на каждый рендер поля
 * заново, поэтому оно вынесено в `ComboboxImpl` — обычный компонент с `setup()`, чей инстанс Vue
 * держит стабильным между перерисовками родителя.
 */
export function Combobox(
  props: UIKitComboboxProps<UINode> & RekaComboboxExtraProps<UINode>,
): VNode {
  return h(ComboboxImpl, props as ComboboxImplBoundProps)
}

// Мостик типов — та же оговорка, что у `SelectImplBoundProps` в `select.ts`
type ComboboxImplBoundProps = UIKitComboboxProps<UINode> & RekaComboboxExtraProps<UINode> & Record<string, unknown>

const ComboboxImpl = defineComponent({
  name: 'RekaComboboxImpl',
  props: {
    value: { type: String, required: false, default: undefined },
    inputValue: { type: String, required: true },
    onInputChange: { type: Function as PropType<UIKitComboboxProps<UINode>['onInputChange']>, required: true },
    onValueChange: { type: Function as PropType<UIKitComboboxProps<UINode>['onValueChange']>, required: true },
    options: { type: Array as PropType<UIKitComboboxProps<UINode>['options']>, required: true },
    renderOption: {
      type: Function as PropType<UIKitComboboxProps<UINode>['renderOption']>,
      required: false,
      default: undefined,
    },
    renderValue: {
      type: Function as PropType<RekaComboboxExtraProps<UINode>['renderValue']>,
      required: false,
      default: undefined,
    },
    resolveOption: {
      type: Function as PropType<RekaComboboxExtraProps<UINode>['resolveOption']>,
      required: false,
      default: undefined,
    },
    /** Действия у пункта (карандаш «Изменить») — только без своего `renderOption`, как в Select */
    renderOptionActions: {
      type: Function as PropType<UIKitComboboxProps<UINode>['renderOptionActions']>,
      required: false,
      default: undefined,
    },
    /** Карандаш у выбранного значения — СОСЕД поля ввода, не внутри него (как `controlActions` у Select) */
    controlActions: { type: null, required: false, default: undefined },
    listFooter: { type: null, required: false, default: undefined },
    /** Ручка списка — поле закрывает его перед своим окном (`onCreate`/`onUpdate`) и возвращает фокус */
    controlRef: {
      type: Object as PropType<{ current: UIKitSelectControl | null }>,
      required: false,
      default: undefined,
    },
    loadError: { type: null, required: false, default: undefined },
    onRetryLoad: { type: Function as PropType<() => void>, required: false, default: undefined },
    loadingText: { type: String, required: false, default: 'Загрузка…' },
    loadErrorText: { type: String, required: false, default: 'Не удалось загрузить' },
    retryText: { type: String, required: false, default: 'Повторить' },
    loading: { type: Boolean, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    disabled: { type: Boolean, required: false, default: undefined },
    onOpenChange: { type: Function as PropType<(open: boolean) => void>, required: false, default: undefined },
    // См. комментарий у `dataFieldName` в `select.ts` — Vue camel-изирует ключ пропа
    dataFieldName: { type: String, required: false, default: undefined },
  },
  setup(props) {
    // Управляемое открытие — тем же приёмом, что `select.ts`: `controlRef.close()` закрывает список
    // перед окном приложения (`onCreate`/`onUpdate`), не дожидаясь клика мимо
    const open = ref(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс Reka-компонента, `$el` вне публичных типов
    const inputRef = ref<any>(null)

    watchEffect((onCleanup) => {
      const handle = props.controlRef
      if (!handle) {
        return
      }
      handle.current = {
        close: () => {
          open.value = false
        },
        focusTrigger: () => {
          const el = inputRef.value?.$el as HTMLElement | undefined
          el?.focus()
        },
      }
      onCleanup(() => {
        if (handle.current) {
          handle.current = null
        }
      })
    })

    // Reka вызывает это при закрытии/блюре и на смену `modelValue` (см. `resetSearchTerm` в
    // `ComboboxInput.vue`) — сюда приходит уже подмодельное `value`, не наша опция
    const displayValue = (rootValue: unknown): string => {
      if (rootValue === undefined || rootValue === null || rootValue === '') {
        return ''
      }
      const raw = String(rootValue)
      const option = props.options.find((opt) => opt.value === raw) ?? props.resolveOption?.(raw)
      if (!option) {
        return raw
      }
      const custom = props.renderValue?.(option)
      return custom || getOptionText(option)
    }

    return () => {
      const {
        value,
        inputValue,
        onInputChange,
        onValueChange,
        options,
        renderOption,
        renderOptionActions,
        controlActions,
        listFooter,
        loadError,
        onRetryLoad,
        loadingText,
        loadErrorText,
        retryText,
        loading,
        placeholder,
        disabled,
        onOpenChange,
        dataFieldName,
      } = props

      // Кнопка(-и) — сосед поля ввода: у `<input>` нет места для вложенной кнопки, как у `<button>`-триггера Select
      const hasSideButtons = !!controlActions

      return h(
        ComboboxRoot,
        {
          modelValue: value,
          'onUpdate:modelValue': ((next: unknown) =>
            onValueChange(next === null || next === undefined ? undefined : String(next))) as (
              value: unknown,
            ) => void,
          open: open.value,
          'onUpdate:open': (next: boolean) => {
            open.value = next
            onOpenChange?.(next)
          },
          disabled,
        },
        {
          default: () => [
            h(ComboboxAnchor, { class: 'relative' }, {
              default: () => [
                h(ComboboxInput, {
                  ref: inputRef,
                  'data-slot': 'combobox-input',
                  'data-field-name': dataFieldName,
                  modelValue: inputValue,
                  'onUpdate:modelValue': (next: string) => onInputChange(next),
                  displayValue,
                  placeholder,
                  class: cn(NATIVE_INPUT_CLASS, hasSideButtons && 'pr-9'),
                }),
                hasSideButtons
                  ? h('div', { class: 'absolute inset-y-0 right-1.5 flex items-center gap-1' }, [controlActions])
                  : null,
              ],
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
                                    {
                                      'data-slot': 'combobox-item-description',
                                      class: 'text-muted-foreground text-xs',
                                    },
                                    descriptionText,
                                  ),
                                ])
                                : optionContent

                              return h(
                                ComboboxItem,
                                {
                                  key: opt.value,
                                  value: opt.value,
                                  // Опция в ожидании подтверждения (§16.7) не выбирается ни мышью, ни клавиатурой
                                  disabled: opt.disabled || opt.pending,
                                  'data-slot': 'combobox-item',
                                  'data-pending': opt.pending ? '' : undefined,
                                  class: cn(
                                    'group/item relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                                    'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                  ),
                                },
                                {
                                  default: () => [
                                    content,
                                    opt.pending
                                      ? h(Loader2, {
                                        class: 'text-muted-foreground ml-auto size-4 shrink-0 animate-spin',
                                      })
                                      : renderOptionActions?.(opt) ?? null,
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
                      listFooter ? h('div', { class: 'mt-1 border-t pt-1' }, listFooter) : null,
                    ],
                  },
                ),
            }),
          ],
        },
      )
    }
  },
})
