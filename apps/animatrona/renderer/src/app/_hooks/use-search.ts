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

import { useDebounce } from '@letar/hooks'
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
  const [results, setResults] = useState<SearchResult[]>([])

  // Слишком короткий запрос гасим до debounce: результаты должны пропадать сразу,
  // как только пользователь стёр строку, а не спустя debounceMs.
  const activeQuery = query.length >= minLength ? query : ''
  const settledQuery = useDebounce(activeQuery, debounceMs)
  const debouncedQuery = activeQuery === '' ? '' : settledQuery
  const isDebouncing = activeQuery !== debouncedQuery

  // Выполнение поиска при изменении debouncedQuery — синхронизация с внешней системой (кэш поиска)
  useEffect(() => {
    if (!debouncedQuery) {
      // oxlint-disable-next-line react/set-state-in-effect -- сброс результатов при пустом запросе
      setResults([])
      return
    }

    const searchResults = search(debouncedQuery)
    // oxlint-disable-next-line react/set-state-in-effect -- результат синхронного поиска по внешнему кэшу
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
  const [ids, setIds] = useState<string[] | null>(null)

  // Как и в useSearch: короткий запрос сбрасывает выборку немедленно, без ожидания таймера.
  const activeQuery = query.length >= 2 ? query : ''
  const settledQuery = useDebounce(activeQuery, debounceMs)
  const debouncedQuery = activeQuery === '' ? '' : settledQuery

  // Выполнение поиска
  useEffect(() => {
    if (!debouncedQuery || isLoading) {
      if (!activeQuery) {
        // oxlint-disable-next-line react/set-state-in-effect -- сброс выборки при слишком коротком запросе
        setIds(null)
      }
      return
    }

    const searchResults = searchIds(debouncedQuery)
    setIds(searchResults)
  }, [debouncedQuery, searchIds, isLoading, activeQuery])

  return ids
}
