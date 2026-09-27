import {
  filterSelectionOptions,
  resolveSearchable,
  type SelectSearchable,
  type UIKitSelectSearch,
} from '@letar/forms-core/uikit'
import { computed, type ComputedRef, ref } from 'vue'

export interface UseSelectionSearchOptions<T extends { value: string | number }> {
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
  /** Поле поиска показывается */
  enabled: ComputedRef<boolean>
  /** Текущий запрос ('' — пусто) */
  query: ComputedRef<string>
  setQuery: (query: string) => void
  /** Опции, прошедшие фильтр; без поиска — весь список */
  filtered: ComputedRef<T[]>
  /** Контракт для скина; `undefined` — поиска нет */
  search: ComputedRef<UIKitSelectSearch | undefined>
}

/**
 * Vue-эквивалент React `useSelectionSearch`: поиск внутри Select — строка запроса, порог показа с
 * гистерезисом и фильтр (с учётом раскладки). Сброс строки на закрытии списка делает скин
 * (`onQueryChange('')`): только он знает, когда список закрылся. Framework-free половина
 * (`resolveSearchable`/`filterSelectionOptions`) — та же, что у React-версии, в `@letar/forms-core/uikit`.
 *
 * Единственная реактивная переменная — `query` (`ref`); всё остальное — `computed` над ней и над
 * геттерами `searchable`/`options`, поэтому нет ни одного эффекта и нечего снимать при уничтожении.
 */
export function useSelectionSearch<T extends { value: string | number }>(
  { searchable, options, getText, match, placeholder, ariaLabel }: UseSelectionSearchOptions<T>,
): SelectionSearchState<T> {
  const queryRef = ref('')
  const query = computed(() => queryRef.value)
  const setQuery = (next: string): void => {
    queryRef.value = next
  }

  const enabled = computed(() => resolveSearchable(searchable(), options().length, queryRef.value))
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
    if (!enabled.value || !queryRef.value.trim()) {
      return currentOptions.slice()
    }
    const filter = customFilter.value
    if (filter) {
      return currentOptions.filter((option) => filter(option, queryRef.value))
    }
    return filterSelectionOptions(currentOptions, queryRef.value, getText, match)
  })

  const search = computed<UIKitSelectSearch | undefined>(() => {
    if (!enabled.value) {
      return undefined
    }
    return {
      query: queryRef.value,
      onQueryChange: setQuery,
      placeholder: settingsPlaceholder.value ?? placeholder,
      ariaLabel,
      visibleValues: new Set(filtered.value.map((option) => String(option.value))),
    }
  })

  return { enabled, query, setQuery, filtered, search }
}
