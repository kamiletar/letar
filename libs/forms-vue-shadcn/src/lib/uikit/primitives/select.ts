import {
  getOptionDescriptionText,
  getOptionText,
  type UIKitOptionRenderState,
  type UIKitSelectControl,
  type UIKitSelectProps,
} from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { Check, ChevronDown, Loader2, X } from 'lucide-vue-next'
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
import { defineComponent, h, type PropType, ref, type VNode, watchEffect } from 'vue'
import type { UINode } from '../ui-node'

const SELECT_TRIGGER_CLASS = cn(
  'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'data-[placeholder]:text-muted-foreground',
)

/**
 * `Select` — тонкая функция-обёртка (контракт `RekaUIKit.Select: (props) => TNode`, см.
 * комментарий в `uikit-reka.ts` — примитивы не хранят своё состояние). `controlRef.close()`/
 * `focusTrigger()` (Stage 3b, вызывается из `run()` конвейера `useSelectionActionsState` перед
 * окном приложения `onCreate`/`onUpdate`) нужен `open`-стейт, переживающий ре-рендеры того же
 * логического Select — обычная функция такое состояние не хранит. Поэтому реализация — настоящий
 * Vue-компонент (`SelectImpl`, персистентный инстанс), а `Select` лишь монтирует его через `h()`,
 * не нарушая внешний контракт `(props) => TNode`.
 */
export function Select(props: UIKitSelectProps<UINode>): VNode {
  return h(SelectImpl, props as SelectImplBoundProps)
}

// Мостик типов: Vue prop-декларации ниже не выражают дженерик `UIKitSelectProps<UINode>` напрямую —
// `h()` передаёт объект как есть, рантайм-форма совпадает с `SelectImpl.props`.
type SelectImplBoundProps = UIKitSelectProps<UINode> & Record<string, unknown>

const SelectImpl = defineComponent({
  name: 'RekaSelectImpl',
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
    clearLabel: { type: String, required: false, default: 'Очистить' },
    // Vue camel-изирует любой ключ props при нормализации (`normalizePropsOptions`), даже с
    // дефисом в исходном объявлении — значение оседает под `dataFieldName`, а не под буквальным
    // `'data-field-name'`. `h(SelectImpl, { 'data-field-name': ... })` со стороны `field-select.ts`
    // резолвится сюда верно (Vue сверяет входящий ключ через camelize/hyphenate), а вот
    // `props['data-field-name']` внутри `setup()` был бы всегда `undefined`
    dataFieldName: { type: String, required: false, default: undefined },
  },
  setup(props) {
    // Управляемое открытие: поле закрывает список перед окном приложения (`controlRef.close()`),
    // как `useState` у React-скина — здесь тот же смысл через `ref()` персистентного компонента
    const open = ref(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс Reka-компонента, `$el` вне публичных типов
    const triggerRef = ref<any>(null)

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
          const el = triggerRef.value?.$el as HTMLElement | undefined
          el?.focus()
        },
      }
      onCleanup(() => {
        if (handle.current) {
          handle.current = null
        }
      })
    })

    return () => {
      const {
        value,
        onValueChange,
        onBlur,
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
        clearLabel,
      } = props

      // Подпись триггера: своя (`renderValue`), пустой результат откатывается на текст опции
      const selectedOption = value !== undefined ? options.find((opt) => opt.value === value) : undefined
      const customValue = selectedOption && renderValue ? renderValue(selectedOption) : undefined
      const hasCustomValue = customValue !== undefined && customValue !== null && customValue !== ''

      // Кнопка очистки и `controlActions` (карандаш выбранного значения) — СОСЕДИ триггера, не внутри
      // него: Reka `SelectTrigger` рендерится как настоящий `<button>`, вложенная кнопка невалидна
      const showClear = !!clearable && !!value && !disabled && !readOnly
      const sideButtons = showClear || !!controlActions

      return h(
        SelectRoot,
        {
          modelValue: value,
          'onUpdate:modelValue': ((next: unknown) =>
            onValueChange(next === null || next === undefined ? undefined : String(next))) as (
              value: unknown,
            ) => void,
          disabled,
          open: open.value,
          // Radix/Reka `readOnly` не знает: не даём открыть список сами
          'onUpdate:open': (next: boolean) => {
            open.value = next && !readOnly
          },
        },
        {
          default: () => [
            label ? h('span', { class: 'mb-2 block text-sm leading-none font-medium' }, label) : null,
            h('div', { class: 'relative' }, [
              h(
                SelectTrigger,
                {
                  ref: triggerRef,
                  'data-slot': 'select-trigger',
                  onBlur,
                  'data-field-name': props.dataFieldName,
                  class: cn(SELECT_TRIGGER_CLASS, sideButtons && 'pr-16'),
                },
                {
                  default: () => [
                    h(
                      SelectValue,
                      { placeholder },
                      // Слот отдаём ВСЕГДА, когда опция известна — не только при своём `renderValue`.
                      // Дефолтный слот Reka (`SelectValue.vue`) ищет текст по `optionsSet`, зарегистрированному
                      // DOM-элементами `SelectItem`, и не переоценивает его, если поменялся только
                      // `textContent` того же пункта (тот же `value`, например после `onUpdate` §16.7)
                      // без смены самого `modelValue` — Vue-реактивность этого вычисления не отслеживает
                      // прямую мутацию DOM. Свой слот читает подпись из нашего же реактивного `options`
                      // и не зависит от внутреннего кеша примитива
                      selectedOption
                        ? { default: () => (hasCustomValue ? customValue : getOptionText(selectedOption)) }
                        : undefined,
                    ),
                    h(SelectIcon, { asChild: true }, {
                      default: () => h(ChevronDown, { class: 'size-4 opacity-50' }),
                    }),
                  ],
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
                        onClick: (e: MouseEvent) => {
                          e.stopPropagation()
                          onValueChange(undefined)
                        },
                      },
                      h(X, { class: 'size-4 opacity-50' }),
                    )
                    : null,
                  controlActions ?? null,
                ])
                : null,
            ]),
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
                    default: () => [
                      h(
                        SelectViewport,
                        { class: 'p-1' },
                        {
                          default: () =>
                            options.map((opt) => {
                              const state: UIKitOptionRenderState = {
                                selected: opt.value === value,
                                disabled: opt.disabled ?? false,
                                pending: opt.pending ?? false,
                              }
                              const itemText = h(
                                SelectItemText,
                                {},
                                { default: () => (renderOption ? renderOption(opt, state) : opt.label) },
                              )
                              // Вторая строка — сосед `ItemText`, как в React-скине; со своим
                              // `renderOption` пункт рисует приложение целиком
                              const descriptionText = getOptionDescriptionText(opt)
                              const content = !renderOption && descriptionText !== ''
                                ? h('div', { class: 'flex min-w-0 flex-1 flex-col' }, [
                                  itemText,
                                  h(
                                    'span',
                                    {
                                      'data-slot': 'select-item-description',
                                      class: 'text-muted-foreground text-xs',
                                    },
                                    descriptionText,
                                  ),
                                ])
                                : itemText

                              return h(
                                SelectItem,
                                {
                                  key: opt.value,
                                  value: opt.value,
                                  // Опция в ожидании подтверждения (§16.7) не выбирается ни мышью, ни клавиатурой
                                  disabled: opt.disabled || opt.pending,
                                  'data-pending': opt.pending ? '' : undefined,
                                  class: cn(
                                    'group/item relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                                    'focus:bg-accent focus:text-accent-foreground',
                                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                  ),
                                },
                                {
                                  default: () => [
                                    content,
                                    opt.pending
                                      ? h(Loader2, {
                                        class: 'text-muted-foreground size-4 shrink-0 animate-spin',
                                      })
                                      : renderOptionActions?.(opt) ?? null,
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
