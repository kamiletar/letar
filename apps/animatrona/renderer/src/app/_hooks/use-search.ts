'use client'

/**
 * useSearch — хук для клиентского поиска аниме
 *
 * Обёртка над SearchProvider с debounce и состоянием query.
 * Заменяет прямые вызовы quickSearchAnime.
 *
 * Использование:
 * ```tsx
 * const { query, setQuery, results, isSearching } = useSearch()
 *
 * <Input value={query} onChange={e => setQuery(e.target.value)} />
 * {results.map(anime => <div>{anime.name}</div>)}
 * ```
 */

import { useEffect, useState } from 'react'

import type { SearchResult } from '@/app/_actions/search.action'

import { useSearchContext } from '../_providers/SearchProvider'

/** Опции хука useSearch */
interface UseSearchOptions {
  /** Задержка debounce в мс (по умолчанию 150) */
  debounceMs?: number
  /** Минимальная длина запроса (по умолчанию 2) */
  minLength?: number
}

/** Возвращаемое значение useSearch */
interface UseSearchResult {
  /** Текущий запрос */
  query: string
  /** Установить запрос */
  setQuery: (query: string) => void
  /** Результаты поиска */
  results: SearchResult[]
  /** Идёт ли поиск (debounce или загрузка кэша) */
  isSearching: boolean
  /** Загружается ли кэш данных */
  isLoading: boolean
  /** Ошибка загрузки */
  error: Error | null
}

/**
 * Хук для клиентского поиска аниме
 *
 * @param options - Опции поиска
 * @returns Состояние поиска и результаты
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const { debounceMs = 150, minLength = 2 } = options
  const { search, isLoading, error } = useSearchContext()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isDebouncing, setIsDebouncing] = useState(false)

  // Debounce запроса
  useEffect(() => {
    if (!query || query.length < minLength) {
      setDebouncedQuery('')
      setResults([])
      return
    }

    setIsDebouncing(true)
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setIsDebouncing(false)
    }, debounceMs)

    return () => {
      clearTimeout(timer)
    }
  }, [query, debounceMs, minLength])

  // Выполнение поиска при изменении debouncedQuery
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      return
    }

    const searchResults = search(debouncedQuery)
    setResults(searchResults)
  }, [debouncedQuery, search])

  return {
    query,
    setQuery,
    results,
    isSearching: isDebouncing || isLoading,
    isLoading,
    error,
  }
}

/**
 * Хук для поиска только ID (для фильтров библиотеки)
 *
 * @param query - Поисковый запрос
 * @param debounceMs - Задержка debounce
 * @returns Массив ID или null (если поиск не активен)
 */
export function useSearchIds(query: string, debounceMs = 250): string[] | null {
  const { searchIds, isLoading } = useSearchContext()
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [ids, setIds] = useState<string[] | null>(null)

  // Debounce запроса
  useEffect(() => {
    if (!query || query.length < 2) {
      setDebouncedQuery('')
      setIds(null)
      return
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Выполнение поиска
  useEffect(() => {
    if (!debouncedQuery || isLoading) {
      if (!query) {
        setIds(null)
      }
      return
    }

    const searchResults = searchIds(debouncedQuery)
    setIds(searchResults)
  }, [debouncedQuery, searchIds, isLoading, query])

  return ids
}
