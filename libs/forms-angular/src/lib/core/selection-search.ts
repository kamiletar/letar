import { computed, type Signal, signal } from '@angular/core'
import {
  filterSelectionOptions,
  resolveSearchable,
  type SelectSearchable,
  type UIKitSelectSearch,
} from '@letar/forms-core/uikit'

export interface CreateSelectionSearchOptions<T extends { value: string | number }> {
  /** Проп `searchable` поля — геттер; `undefined` ≡ `'auto'` */
  searchable: () => SelectSearchable<T> | undefined
  /**
   * Полный НЕфильтрованный список после созданных опций и наложения правок, без служебных пунктов
   * («+ Добавить») — геттер: по нему считается порог, иначе поле поиска исчезало бы при вводе
   */
  options: () => readonly T[]
  /** Текст опции (`getOptionText`) — по нему идёт поиск */
  getText: (option: T) => string
  /** Предикат подстроки скина; по умолчанию — из `forms-core` (без регистра, диакритики, «ё» ≡ «е») */
  match?: (text: string, query: string) => boolean
  /** Подсказка поля поиска по умолчанию (i18n); `searchable.placeholder` сильнее */
  placeholder: string
  /** `aria-label` поля поиска (i18n) */
  ariaLabel: string
}

export interface SelectionSearchState<T> {
  readonly enabled: Signal<boolean>
  /** Текущий запрос ('' — пусто) */
  readonly query: Signal<string>
  setQuery: (query: string) => void
  /** Опции, прошедшие фильтр; без поиска — весь список */
  readonly filtered: Signal<T[]>
  /** Контракт для шаблона поля; `undefined` — поиска нет */
  readonly search: Signal<UIKitSelectSearch | undefined>
}

/**
 * Angular-эквивалент React `useSelectionSearch`/Vue `useSelectionSearch` — обычная фабрика сигналов
 * (без `inject()` — здесь нечего внедрять, вызывать можно и вне injection context, но по соглашению
 * пакета вызывается из конструктора компонента поля вместе с остальными фабриками этого этапа).
 *
 * Framework-free половина (`resolveSearchable`/`filterSelectionOptions`) — та же, что у React/Vue-версий,
 * в `@letar/forms-core/uikit`. Единственное реактивное состояние — `querySignal`; всё остальное — `computed`.
 */
export function createSelectionSearch<T extends { value: string | number }>(
  { searchable, options, getText, match, placeholder, ariaLabel }: CreateSelectionSearchOptions<T>,
): SelectionSearchState<T> {
  const querySignal = signal('')
  const setQuery = (next: string): void => {
    querySignal.set(next)
  }

  const enabled = computed(() => resolveSearchable(searchable(), options().length, querySignal()))
  const customFilter = computed(() => {
    const value = searchable()
    return typeof value === 'object' ? value.filter : undefined
  })
  const settingsPlaceholder = computed(() => {
    const value = searchable()
    return typeof value === 'object' ? value.placeholder : undefined
  })

  const filtered = computed<T[]>(() => {
    const currentOptions = options()
    const currentQuery = querySignal()
    if (!enabled() || !currentQuery.trim()) {
      return currentOptions.slice()
    }
    const filter = customFilter()
    if (filter) {
      return currentOptions.filter((option) => filter(option, currentQuery))
    }
    return filterSelectionOptions(currentOptions, currentQuery, getText, match)
  })

  const search = computed<UIKitSelectSearch | undefined>(() => {
    if (!enabled()) {
      return undefined
    }
    return {
      query: querySignal(),
      onQueryChange: setQuery,
      placeholder: settingsPlaceholder() ?? placeholder,
      ariaLabel,
      visibleValues: new Set(filtered().map((option) => String(option.value))),
    }
  })

  return { enabled, query: querySignal.asReadonly(), setQuery, filtered, search }
}
