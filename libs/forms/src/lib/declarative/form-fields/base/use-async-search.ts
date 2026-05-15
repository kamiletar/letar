'use client'

import { useState } from 'react'
import { useDebounce } from './use-debounce'

/**
 * Async request result (compatible with TanStack Query and ZenStack hooks)
 */
export interface AsyncQueryResult<TData = unknown> {
  data?: TData[]
  isLoading?: boolean
  error?: Error | null
}

/**
 * Async request function for loading options
 * @param search - Search string (empty if request not started)
 */
export type AsyncQueryFn<TData = unknown> = (search: string) => AsyncQueryResult<TData>

/**
 * Options for useAsyncSearch
 */
export interface UseAsyncSearchOptions<TData = unknown> {
  /**
   * Async request function (returns { data, isLoading, error })
   */
  useQuery?: AsyncQueryFn<TData>

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
export function useAsyncSearch<TData = unknown>(
  options: UseAsyncSearchOptions<TData> = {}
): UseAsyncSearchResult<TData> {
  const { useQuery, debounce = 300, minChars = 1, initialValue = '' } = options

  // State input
  const [inputValue, setInputValue] = useState(initialValue)

  // Debounced value for query
  const debouncedSearch = useDebounce(inputValue, debounce)

  // Should the request be triggered?
  const shouldQuery = debouncedSearch.length >= minChars

  // Call useQuery (if provided)
  // Pass empty string if we shouldn't query, so the hook is always called
  const queryResult = useQuery?.(shouldQuery ? debouncedSearch : '')

  // Extract results
  const { data, isLoading = false, error } = queryResult ?? {}

  return {
    inputValue,
    setInputValue,
    debouncedSearch,
    shouldQuery,
    isLoading,
    data,
    error,
  }
}
