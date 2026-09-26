'use client'

import {
  filterSelectionOptions,
  resolveSearchable,
  type SelectSearchable,
  type UIKitSelectSearch,
} from '@letar/forms-core/uikit'
import { useCallback, useMemo, useState } from 'react'

export interface UseSelectionSearchOptions<T extends { value: string | number }> {
  /** Проп `searchable` поля; `undefined` ≡ `'auto'` */
  searchable: SelectSearchable<T> | undefined
  /**
   * Полный НЕфильтрованный список после созданных опций и наложения правок, без служебных пунктов
   * («+ Добавить»): по нему считается порог, иначе поле поиска исчезало бы при вводе
   */
  options: readonly T[]
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
  enabled: boolean
  /** Текущий запрос ('' — пусто) */
  query: string
  setQuery: (query: string) => void
  /** Опции, прошедшие фильтр; без поиска — весь список */
  filtered: T[]
  /** Контракт для скина; `undefined` — поиска нет */
  search: UIKitSelectSearch | undefined
}

/**
 * Поиск внутри Select для `useFieldState`: строка запроса, порог показа с гистерезисом и фильтр
 * (с учётом раскладки). Сброс строки на закрытии списка делает скин (`onQueryChange('')`): только он
 * знает, когда список закрылся. Не зависит от UI-библиотеки.
 *
 * ⚠️ Вызывать только из `useFieldState`, не из `render` (хуки в `render` небезопасны).
 */
export function useSelectionSearch<T extends { value: string | number }>(
  { searchable, options, getText, match, placeholder, ariaLabel }: UseSelectionSearchOptions<T>,
): SelectionSearchState<T> {
  const [query, setQueryState] = useState('')
  const setQuery = useCallback((next: string) => setQueryState(next), [])

  const enabled = resolveSearchable(searchable, options.length, query)
  const customFilter = typeof searchable === 'object' ? searchable.filter : undefined
  const settingsPlaceholder = typeof searchable === 'object' ? searchable.placeholder : undefined

  const filtered = useMemo(() => {
    if (!enabled || !query.trim()) {
      return options.slice()
    }
    if (customFilter) {
      return options.filter((option) => customFilter(option, query))
    }
    return filterSelectionOptions(options, query, getText, match)
  }, [enabled, query, options, customFilter, getText, match])

  const search = useMemo<UIKitSelectSearch | undefined>(() => {
    if (!enabled) {
      return undefined
    }
    return {
      query,
      onQueryChange: setQuery,
      placeholder: settingsPlaceholder ?? placeholder,
      ariaLabel,
      visibleValues: new Set(filtered.map((option) => String(option.value))),
    }
  }, [enabled, query, setQuery, settingsPlaceholder, placeholder, ariaLabel, filtered])

  return { enabled, query, setQuery, filtered, search }
}
