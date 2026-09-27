import {
  getOptionDescriptionText,
  isCreateOptionValue,
  type UIKitOptionRenderState,
  type UIKitSelectControl,
  type UIKitSelectProps,
} from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { Check, ChevronDown, Loader2, X } from 'lucide-vue-next'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, defineComponent, h, nextTick, type PropType, ref, type VNode, watch, watchEffect } from 'vue'
import type { UINode } from '../ui-node'
import { hasDescription, SELECT_TRIGGER_CLASS } from './select-common'

type Option = UIKitSelectProps<UINode>['options'][number]

/** Пункт нельзя выбрать: заблокирован или ждёт подтверждения сервера (§16.7) */
const isInert = (opt: Option) => !!opt.disabled || !!opt.pending

/**
 * Select с полем поиска — Vue-эквивалент React `SearchableSelect` (`@letar/forms-shadcn`,
 * `select-searchable.tsx`, Stage 3c). Reka `SelectRoot` не годится (фокусная модель Select
 * несовместима с полем ввода внутри списка — то же обоснование, что у React-версии), поэтому
 * список — Popover (`PopoverRoot`/`PopoverTrigger`/`PopoverContent`) с собственным
 * `role="listbox"`. Персистентный компонент — как `SelectImpl` (`select.ts`): `open`/`highlighted`
 * должны переживать ре-рендеры одного и того же логического Select, обычная функция такое
 * состояние не хранит.
 */
export function SearchableSelect(props: UIKitSelectProps<UINode>): VNode {
  return h(SearchableSelectImpl, props as SearchableSelectImplBoundProps)
}

type SearchableSelectImplBoundProps = UIKitSelectProps<UINode> & Record<string, unknown>

const SearchableSelectImpl = defineComponent({
  name: 'RekaSearchableSelectImpl',
  props: {
    value: { type: String, required: false, default: undefined },
    onValueChange: { type: Function as PropType<UIKitSelectProps<UINode>['onValueChange']>, required: true },
    onBlur: { type: Function as PropType<UIKitSelectProps<UINode>['onBlur']>, required: false, default: undefined },
    options: { type: Array as PropType<UIKitSelectProps<UINode>['options']>, required: true },
    renderOption: {
      type: Function as PropType<UIKitSelectProps<UINode>['renderOption']>,
      required: false,
      default: undefined,
    },
    renderValue: {
      type: Function as PropType<UIKitSelectProps<UINode>['renderValue']>,
      required: false,
      default: undefined,
    },
    label: { type: null, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    disabled: { type: Boolean, required: false, default: undefined },
    readOnly: { type: Boolean, required: false, default: undefined },
    clearable: { type: Boolean, required: false, default: undefined },
    search: { type: Object as PropType<UIKitSelectProps<UINode>['search']>, required: false, default: undefined },
    renderOptionActions: {
      type: Function as PropType<UIKitSelectProps<UINode>['renderOptionActions']>,
      required: false,
      default: undefined,
    },
    controlActions: { type: null, required: false, default: undefined },
    listFooter: { type: null, required: false, default: undefined },
    controlRef: {
      type: Object as PropType<{ current: UIKitSelectControl | null }>,
      required: false,
      default: undefined,
    },
    emptyContent: { type: null, required: false, default: undefined },
    loading: { type: Boolean, required: false, default: undefined },
    loadingMessage: { type: String, required: false, default: undefined },
    showUnknownValue: { type: Boolean, required: false, default: undefined },
    clearLabel: { type: String, required: false, default: 'Очистить' },
    // См. комментарий у того же пропа в `select.ts` — Vue camel-изирует `data-field-name`
    dataFieldName: { type: String, required: false, default: undefined },
    describedBy: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const open = ref(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс Reka-компонента, `$el` вне публичных типов
    const triggerRef = ref<any>(null)
    const searchInputRef = ref<HTMLInputElement | null>(null)
    const highlighted = ref<string | null>(null)

    const setOpen = (next: boolean) => {
      if (next && (props.readOnly || props.disabled)) {
        return
      }
      if (open.value === next) {
        return
      }
      open.value = next
      if (!next) {
        // Строка поиска не переживает закрытие; «тронуто» — после закрытия, а не при переходе фокуса в поле поиска
        props.search?.onQueryChange('')
        props.onBlur?.()
      }
    }

    watchEffect((onCleanup) => {
      const handle = props.controlRef
      if (!handle) {
        return
      }
      handle.current = {
        close: () => setOpen(false),
        focusTrigger: () => triggerRef.value?.$el?.focus(),
      }
      onCleanup(() => {
        if (handle.current) {
          handle.current = null
        }
      })
    })

    const query = computed(() => props.search?.query ?? '')
    const visible = computed(() => props.search?.visibleValues)
    // Список — по видимым значениям; «выбранное» и пустой вариант считаются по полному `options`. Служебный
    // пункт «+ Добавить…» фильтром не режется: поле само подписывает его текущим запросом
    const listOptions = computed(() => {
      const visibleSet = visible.value
      return props.options.filter((opt) => isCreateOptionValue(opt.value) || !visibleSet || visibleSet.has(opt.value))
    })
    const realCount = computed(() => listOptions.value.filter((opt) => !isCreateOptionValue(opt.value)).length)

    // Подсветка: при открытии — выбранный пункт, при вводе — первый подходящий (Enter берёт его)
    watch([open, query], ([isOpen]) => {
      if (!isOpen) {
        highlighted.value = null
        return
      }
      const list = listOptions.value
      const selected = query.value === ''
        ? list.find((opt) => opt.value === props.value && !isInert(opt))
        : undefined
      const first = list.find((opt) => !isInert(opt) && !isCreateOptionValue(opt.value))
      highlighted.value = (selected ?? first)?.value ?? null
    })
    // Исчезнувшая из выдачи опция подсветку не удерживает
    watch(listOptions, (next) => {
      if (highlighted.value !== null && !next.some((opt) => opt.value === highlighted.value)) {
        highlighted.value = null
      }
    })

    const optionId = (index: number) => `letar-searchable-select-opt-${index}`
    const highlightedIndex = computed(() => {
      if (highlighted.value === null) {
        return -1
      }
      return listOptions.value.findIndex((opt) => opt.value === highlighted.value)
    })
    watch(highlightedIndex, (index) => {
      if (index < 0) {
        return
      }
      void nextTick(() => {
        document.getElementById(optionId(index))?.scrollIntoView?.({ block: 'nearest' })
      })
    })

    const select = (opt: Option) => {
      if (isInert(opt)) {
        return
      }
      props.onValueChange(opt.value)
      setOpen(false)
    }

    /** Сдвиг подсветки на `step` по доступным пунктам (по кругу) */
    const moveHighlight = (step: 1 | -1) => {
      const enabled = listOptions.value.filter((opt) => !isInert(opt))
      if (enabled.length === 0) {
        return
      }
      const current = enabled.findIndex((opt) => opt.value === highlighted.value)
      const next = current === -1
        ? (step === 1 ? 0 : enabled.length - 1)
        : (current + step + enabled.length) % enabled.length
      highlighted.value = enabled[next]!.value
    }

    const handleSearchKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
      } else if (event.key === 'Enter') {
        // Выбор пункта (или ничего), но не отправка формы из поля поиска
        event.preventDefault()
        const index = highlightedIndex.value
        const opt = index >= 0 ? listOptions.value[index] : undefined
        if (opt) {
          select(opt)
        }
      } else if (event.key === 'Tab') {
        // Popover зацикливает бы фокус внутри списка, а в нём одно поле — Tab не уходил бы никуда.
        // Закрываем и возвращаем фокус на триггер: следующий Tab продолжает обход страницы
        event.preventDefault()
        setOpen(false)
      }
    }

    const handleTriggerKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setOpen(true)
      }
    }

    return () => {
      const {
        value,
        options,
        renderOption,
        renderValue,
        label,
        placeholder,
        disabled,
        readOnly,
        clearable,
        renderOptionActions,
        controlActions,
        listFooter,
        emptyContent,
        loading,
        loadingMessage,
        showUnknownValue,
        clearLabel,
        describedBy,
      } = props

      const selectedOption = value !== undefined ? options.find((opt) => opt.value === value) : undefined
      const customValue = selectedOption && renderValue ? renderValue(selectedOption) : undefined
      const hasCustomValue = customValue !== undefined && customValue !== null && customValue !== ''
      // Значение есть, а его опция ещё грузится: в триггере текст загрузки, а не пустой placeholder
      const showLoadingValue = !!loading && !!loadingMessage && !!value && !selectedOption
      const valueContent = selectedOption
        ? (hasCustomValue ? customValue : selectedOption.label)
        : showLoadingValue
        ? loadingMessage
        : showUnknownValue && value
        ? value
        : undefined

      const showClear = !!clearable && !!value && !disabled && !readOnly
      const sideButtons = showClear || !!controlActions

      const list = listOptions.value
      const highlightedIdx = highlightedIndex.value

      return h(
        PopoverRoot,
        {
          open: open.value,
          'onUpdate:open': setOpen,
        },
        {
          default: () => [
            label ? h('span', { class: 'mb-2 block text-sm leading-none font-medium' }, label) : null,
            h('div', { class: 'relative' }, [
              h(
                PopoverTrigger,
                { asChild: true },
                {
                  default: () =>
                    h(
                      'button',
                      {
                        ref: triggerRef,
                        type: 'button',
                        role: 'combobox',
                        'data-slot': 'select-trigger',
                        'data-placeholder': valueContent === undefined ? '' : undefined,
                        'data-field-name': props.dataFieldName,
                        'aria-haspopup': 'listbox',
                        'aria-expanded': open.value,
                        // Выбранное значение ждёт сервера (§16.7): подпись уже новая, спиннер рядом
                        'aria-busy': selectedOption?.pending ? true : undefined,
                        'aria-describedby': describedBy,
                        disabled,
                        onKeydown: handleTriggerKeyDown,
                        // Пока список открыт, фокус ушёл в поле поиска — это не «поле покинуто»
                        onBlur: () => {
                          if (!open.value) {
                            props.onBlur?.()
                          }
                        },
                        class: cn(SELECT_TRIGGER_CLASS, sideButtons && 'pr-16'),
                      },
                      [
                        h('span', { class: 'truncate text-left' }, valueContent ?? placeholder),
                        loading || selectedOption?.pending
                          ? h(Loader2, { class: 'text-muted-foreground size-4 shrink-0 animate-spin' })
                          : null,
                        h(ChevronDown, { class: 'size-4 shrink-0 opacity-50' }),
                      ],
                    ),
                },
              ),
              sideButtons
                ? h('div', { class: 'absolute inset-y-0 right-8 flex items-center gap-1' }, [
                  showClear
                    ? h(
                      'button',
                      {
                        type: 'button',
                        'data-slot': 'select-clear',
                        'aria-label': clearLabel,
                        class:
                          'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]',
                        onClick: () => {
                          props.onValueChange(undefined)
                          triggerRef.value?.$el?.focus()
                        },
                      },
                      h(X, { class: 'size-4 opacity-50' }),
                    )
                    : null,
                  controlActions ?? null,
                ])
                : null,
            ]),
            h(PopoverPortal, {}, {
              default: () =>
                h(
                  PopoverContent,
                  {
                    'data-slot': 'select-content',
                    align: 'start',
                    sideOffset: 4,
                    onOpenAutoFocus: (event: Event) => {
                      event.preventDefault()
                      searchInputRef.value?.focus()
                    },
                    class: cn(
                      'bg-popover text-popover-foreground z-50 w-[var(--reka-popper-anchor-width)] min-w-[8rem] overflow-hidden rounded-md border p-0 shadow-md',
                    ),
                  },
                  {
                    default: () => [
                      h('div', { class: 'border-b p-1' }, [
                        h('input', {
                          ref: searchInputRef,
                          'data-slot': 'select-search',
                          type: 'text',
                          role: 'searchbox',
                          autocomplete: 'off',
                          value: query.value,
                          onInput: (event: Event) => {
                            props.search?.onQueryChange((event.target as HTMLInputElement).value)
                          },
                          onKeydown: handleSearchKeyDown,
                          placeholder: props.search?.placeholder,
                          'aria-label': props.search?.ariaLabel,
                          'aria-activedescendant': highlightedIdx >= 0 ? optionId(highlightedIdx) : undefined,
                          class:
                            'placeholder:text-muted-foreground h-8 w-full rounded-sm bg-transparent px-2 text-sm outline-none',
                        }),
                      ]),
                      h(
                        'div',
                        { role: 'listbox', 'aria-label': props.search?.ariaLabel, class: 'max-h-60 overflow-auto p-1' },
                        [
                          loading && realCount.value === 0
                            ? h(
                              'div',
                              { class: 'text-muted-foreground px-2 py-1.5 text-sm' },
                              loadingMessage ?? 'Загрузка...',
                            )
                            : null,
                          !loading && realCount.value === 0
                            ? h(
                              'div',
                              { class: 'text-muted-foreground px-2 py-1.5 text-sm' },
                              emptyContent ?? 'Ничего не найдено',
                            )
                            : null,
                          ...list.map((opt, index) => {
                            const selected = opt.value === value
                            const state: UIKitOptionRenderState = {
                              selected,
                              disabled: opt.disabled ?? false,
                              pending: opt.pending ?? false,
                            }
                            const content = renderOption ? renderOption(opt, state) : opt.label
                            const descriptionText = getOptionDescriptionText(opt)
                            const descriptionNode = !renderOption && hasDescription(descriptionText)
                              ? h('div', { class: 'flex min-w-0 flex-1 flex-col' }, [
                                content,
                                h(
                                  'span',
                                  { 'data-slot': 'select-item-description', class: 'text-muted-foreground text-xs' },
                                  descriptionText,
                                ),
                              ])
                              : content

                            return h(
                              'div',
                              {
                                key: opt.value,
                                id: optionId(index),
                                role: 'option',
                                'aria-selected': selected,
                                'aria-disabled': isInert(opt) || undefined,
                                'data-highlighted': index === highlightedIdx ? '' : undefined,
                                'data-disabled': isInert(opt) || undefined,
                                'data-pending': opt.pending ? '' : undefined,
                                onMousemove: () => {
                                  if (!isInert(opt) && highlighted.value !== opt.value) {
                                    highlighted.value = opt.value
                                  }
                                },
                                onClick: () => select(opt),
                                class: cn(
                                  'group/item relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                                  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                ),
                              },
                              [
                                descriptionNode,
                                opt.pending
                                  ? h(Loader2, { class: 'text-muted-foreground size-4 shrink-0 animate-spin' })
                                  : renderOptionActions?.(opt) ?? null,
                                selected
                                  ? h(
                                    'span',
                                    { class: 'absolute right-2 flex size-3.5 items-center justify-center' },
                                    h(Check, { class: 'size-4' }),
                                  )
                                  : null,
                              ],
                            )
                          }),
                        ],
                      ),
                      listFooter ? h('div', { class: 'border-t p-1' }, listFooter) : null,
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
