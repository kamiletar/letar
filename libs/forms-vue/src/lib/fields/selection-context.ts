import { computed, type ComputedRef, defineComponent, inject, type InjectionKey, type PropType, provide } from 'vue'

/** Где стоит слот: в пункте списка или у выбранного значения (сосед триггера) */
export type SelectionSlotScope = 'option' | 'value'

/** Локализованные строки слотов — собирает поле (см. `selection-strings.ts`) */
export interface SelectionActionStrings {
  /** «Изменить» — `title` карандаша */
  edit: string
  /** «Изменить «<текст>»» — `aria-label` карандаша */
  editAria: (text: string) => string
  /** «+ Добавить…» — подпись `CreateButton` (headless Select без поиска, текст всегда один) */
  create: string
  /** Не используется до Stage 3f (`searchable`) — оставлено для контракта, идентичного `forms-vue-shadcn` */
  createWithSearch: (search: string) => string
}

/** Контекст поля — ОДИН провайдер на поле, общий для всех слотов */
export interface SelectionActionsContextValue {
  /** Идёт действие (`onCreate`/`onUpdate`): повторные запуски игнорируются, кнопки `disabled` */
  pending: boolean
  canCreate: boolean
  hasOnUpdate: boolean
  /** `!disabled && !readOnly`; в Этапе 3e всегда `true` — `dependsOn` (Stage 3f) ещё не подключён */
  interactive: boolean
  /** Текст поиска — до Stage 3f (`searchable`) всегда `''` */
  search: string
  runCreate: () => void
  runEdit: (option: unknown, scope: 'option' | 'value') => void
  strings: SelectionActionStrings
}

/** Контекст опции — поле ставит его вокруг `renderOption`, кнопки пункта, кнопки у значения */
export interface SelectionOptionContextValue {
  /** Публичная опция приложения (после наложения правок) */
  option: unknown
  /** `getOptionText(option)` — для `aria-label` */
  text: string
  editable: boolean
  scope: SelectionSlotScope
}

const SELECTION_ACTIONS_KEY: InjectionKey<ComputedRef<SelectionActionsContextValue>> = Symbol(
  'letar-forms-vue-selection-actions',
)
const SELECTION_OPTION_KEY: InjectionKey<ComputedRef<SelectionOptionContextValue>> = Symbol(
  'letar-forms-vue-selection-option',
)

/**
 * `provide`/`inject`-обвязка для `Field.Select.EditButton`/`.CreateButton` (Этап 3e) — headless-
 * версия того же паттерна, что `forms-vue-shadcn` (её `selection-context.ts`, тот же дизайн, тот же
 * повод: значение меняется на каждый рендер поля, `provide()` вызывается один раз в `setup()`
 * компонента-обёртки, поэтому провайдится `computed(() => props.value)`, а не сырой проп).
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
