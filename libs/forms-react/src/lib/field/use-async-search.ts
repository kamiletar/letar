'use client'

import type { FieldDeps } from '@letar/forms-core/uikit'
import { useState } from 'react'
import { useDebounce } from './use-debounce'

/**
 * Async request result (compatible with TanStack Query and ZenStack hooks)
 */
export interface AsyncQueryResult<TData = unknown> {
  data?: TData[]
  isLoading?: boolean
  error?: Error | null
  /**
   * Данные прежнего запроса, показанные пока идёт новый (`placeholderData`/`keepPreviousData` TanStack Query;
   * у `UseQueryResult` поле есть). У зависимых полей (§18.7): пока родитель сменился, а настоящего ответа для
   * него нет, эти данные чужие — поле их скрывает
   */
  isPlaceholderData?: boolean
}

/**
 * Async request function for loading options
 * @param search - Search string (empty if request not started)
 * @param deps - Значения родителей (`dependsOn`, §18); без `dependsOn` — `{}`. Хук прежней формы `(search)` подходит
 */
export type AsyncQueryFn<TData = unknown, TDeps extends FieldDeps = FieldDeps> = (
  search: string,
  deps: TDeps,
) => AsyncQueryResult<TData>

/**
 * Options for useAsyncSearch
 */
export interface UseAsyncSearchOptions<TData = unknown, TDeps extends FieldDeps = FieldDeps> {
  /**
   * Async request function (returns { data, isLoading, error })
   */
  useQuery?: AsyncQueryFn<TData, TDeps>

  /** Значения родителей (`dependsOn`, §18) — вторым аргументом в `useQuery`; по умолчанию `{}` */
  deps?: TDeps

  /**
   * Ключ зависимостей (`serializeDeps`). Задан у зависимого поля: при смене ключа результат с
   * `isPlaceholderData: true` (данные прежнего родителя) скрывается — пустой список с `isLoading: true`, пока нет
   * настоящего ответа для нового ключа. Печать в поиске внутри того же родителя прежние данные оставляет.
   */
  depsKey?: string

  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounce?: number

  /**
   * Minimum characters to start searching
   * @default 1
   */
  minChars?: number

  /**
   * Initial input value
   * @default ''
   */
  initialValue?: string
}

/**
 * Result useAsyncSearch
 */
export interface UseAsyncSearchResult<TData = unknown> {
  /** Current value input */
  inputValue: string

  /** Function for changing input value */
  setInputValue: (value: string) => void

  /** Debounced value for query */
  debouncedSearch: string

  /** Whether the request should be triggered (enough characters) */
  shouldQuery: boolean

  /** Whether loading is in progress */
  isLoading: boolean

  /** Request result (data array) */
  data: TData[] | undefined

  /** Error request */
  error: Error | null | undefined
}

const NO_DEPS: FieldDeps = {}

/**
 * Hook for async search with debounce
 *
 * Combines common input management, debounce and async request logic
 * for Combobox and Autocomplete components.
 *
 * @example Usage with ZenStack hook
 * ```tsx
 * const {
 *   inputValue,
 *   setInputValue,
 *   shouldQuery,
 *   isLoading,
 *   data,
 * } = useAsyncSearch({
 *   useQuery: (search) => useFindManyUser({
 *     where: { name: { contains: search, mode: 'insensitive' } },
 *     take: 20,
 *   }),
 *   debounce: 300,
 *   minChars: 2,
 * })
 * ```
 *
 * @example Usage for local filtering
 * ```tsx
 * const { inputValue, setInputValue, debouncedSearch } = useAsyncSearch({
 *   debounce: 200,
 *   minChars: 1,
 * })
 *
 * const filteredOptions = useMemo(() => {
 *   return options.filter(opt => opt.label.includes(debouncedSearch))
 * }, [options, debouncedSearch])
 * ```
 */
export function useAsyncSearch<TData = unknown, TDeps extends FieldDeps = FieldDeps>(
  options: UseAsyncSearchOptions<TData, TDeps> = {},
): UseAsyncSearchResult<TData> {
  const { useQuery, debounce = 300, minChars = 1, initialValue = '', deps = NO_DEPS as TDeps, depsKey } = options

  // State input
  const [inputValue, setInputValue] = useState(initialValue)

  // Debounced value for query
  const debouncedSearch = useDebounce(inputValue, debounce)

  // Should the request be triggered?
  const shouldQuery = debouncedSearch.length >= minChars

  // Call useQuery (if provided)
  // Pass empty string if we shouldn't query, so the hook is always called
  const queryResult = useQuery?.(shouldQuery ? debouncedSearch : '', deps)

  // Extract results
  const { data, isLoading = false, error, isPlaceholderData = false } = queryResult ?? {}

  // Зависимое поле (§18.7): для какого ключа зависимостей последний раз пришёл настоящий ответ. Первый ключ — тот,
  // с которым поле смонтировано: статичный `placeholderData` на старте не прячем
  const [answeredDepsKey, setAnsweredDepsKey] = useState(depsKey)
  // Настоящий ответ для текущего ключа — запоминаем прямо в рендере (штатная подстройка состояния React)
  if (data !== undefined && !isPlaceholderData && answeredDepsKey !== depsKey) {
    setAnsweredDepsKey(depsKey)
  }
  const foreignPlaceholder = depsKey !== undefined && isPlaceholderData && answeredDepsKey !== depsKey

  return {
    inputValue,
    setInputValue,
    debouncedSearch,
    shouldQuery,
    isLoading: foreignPlaceholder ? true : isLoading,
    data: foreignPlaceholder ? undefined : data,
    error,
  }
}
