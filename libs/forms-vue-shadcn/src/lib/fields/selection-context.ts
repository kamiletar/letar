import { computed, type ComputedRef, defineComponent, inject, type InjectionKey, type PropType, provide } from 'vue'

/** Где стоит слот: в пункте, у значения (вне триггера) или внутри триггера (там слоты запрещены) */
export type SelectionSlotScope = 'option' | 'value' | 'value-text'

/** Локализованные строки слотов — собирает поле (у скина свои словари, см. `selection-strings.ts`) */
export interface SelectionActionStrings {
  /** «Изменить» — `title` карандаша */
  edit: string
  /** «Изменить «<текст>»» — `aria-label` карандаша */
  editAria: (text: string) => string
  /** «+ Добавить…» — подпись `CreateButton` у Select */
  create: string
  /** «+ Добавить "<поиск>"» — подпись `CreateButton` у Combobox (в Select всегда пустой поиск) */
  createWithSearch: (search: string) => string
}

/** Контекст поля — ОДИН провайдер на поле, общий для всех слотов */
export interface SelectionActionsContextValue {
  /** Идёт действие (`onCreate`/`onUpdate`): повторные запуски игнорируются, кнопки `disabled` */
  pending: boolean
  canCreate: boolean
  hasOnUpdate: boolean
  /** `!disabled && !readOnly` */
  interactive: boolean
  /** Текст поиска Combobox; `''` у Select (Stage 3c ещё не подключён) */
  search: string
  runCreate: () => void
  runEdit: (option: unknown, scope: 'option' | 'value') => void
  strings: SelectionActionStrings
}

/** Контекст опции — поле ставит его вокруг `renderOption`, кнопок пункта, `controlActions`, `renderValue` */
export interface SelectionOptionContextValue {
  /** Публичная опция приложения (после наложения правок) */
  option: unknown
  /** `getOptionText(option)` — для `aria-label` */
  text: string
  editable: boolean
  scope: SelectionSlotScope
}

const SELECTION_ACTIONS_KEY: InjectionKey<ComputedRef<SelectionActionsContextValue>> = Symbol(
  'letar-forms-vue-shadcn-selection-actions',
)
const SELECTION_OPTION_KEY: InjectionKey<ComputedRef<SelectionOptionContextValue>> = Symbol(
  'letar-forms-vue-shadcn-selection-option',
)

/**
 * Vue-эквивалент React `SelectionActionsProvider`/`SelectionOptionProvider` (`@letar/forms-react`,
 * `selection-context.tsx`) — `provide`/`inject`, не пропсы через каждый уровень рендера, как
 * `FormGroup`/`AppFormContext` в `@letar/forms-vue` (`form-group.ts`, `form-context.ts`). Отличие
 * от их провайдеров: значение здесь меняется на каждый рендер поля (новый `pending`, новый
 * `optionContext` на каждый пункт списка), а `provide()` вызывается один раз в `setup()` этого
 * компонента-обёртки — поэтому провайдится не сырое значение пропа, а `computed(() => props.value)`,
 * который остаётся живым все ре-рендеры этого инстанса. Потребитель (`useSelectionActions`/
 * `useSelectionOption`, вызываются из `setup()` `SelectEditButton`/`SelectCreateButton`) читает
 * `.value` внутри своей render-замыкания — обычный реактивный `inject`, без ручной синхронизации.
 */
export const SelectionActionsProvider = defineComponent({
  name: 'SelectionActionsProvider',
  props: {
    value: { type: Object as PropType<SelectionActionsContextValue>, required: true },
  },
  setup(props, { slots }) {
    provide(SELECTION_ACTIONS_KEY, computed(() => props.value))
    return () => slots.default?.()
  },
})

export const SelectionOptionProvider = defineComponent({
  name: 'SelectionOptionProvider',
  props: {
    value: { type: Object as PropType<SelectionOptionContextValue>, required: true },
  },
  setup(props, { slots }) {
    provide(SELECTION_OPTION_KEY, computed(() => props.value))
    return () => slots.default?.()
  },
})

/** `null` — вызвано вне `SelectionActionsProvider` (кнопка использована не в поле выбора) */
export function useSelectionActions(): ComputedRef<SelectionActionsContextValue> | null {
  return inject(SELECTION_ACTIONS_KEY, null)
}

/** `null` — вызвано вне `SelectionOptionProvider` */
export function useSelectionOption(): ComputedRef<SelectionOptionContextValue> | null {
  return inject(SELECTION_OPTION_KEY, null)
}
