'use client'

import type { FuseResultMatch } from 'fuse.js'
import Fuse from 'fuse.js'
import { useEffect, useMemo, useState } from 'react'

import type { SearchItem } from '@/lib/search-index'

import { useDebounce } from '@letar/hooks'

/** Задержка debounce для поискового запроса (мс) */
const SEARCH_DEBOUNCE_DELAY = 300

/** Результат поиска с совпадениями */
export interface SearchResult {
  item: SearchItem
  matches?: readonly FuseResultMatch[]
}

/** Группа результатов по документу */
export interface SearchGroup {
  title: string
  category: string
  items: SearchResult[]
}

/**
 * Хук для поиска по документам.
 * Использует Fuse.js для fuzzy-поиска.
 * Индекс загружается динамически для уменьшения bundle size.
 */
export function useSearch() {
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Динамическая загрузка индекса при монтировании
  useEffect(() => {
    import('@/lib/search-index')
      .then((module) => {
        setSearchData(module.searchIndex)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Ошибка загрузки индекса'))
        setIsLoading(false)
      })
  }, [])

  // Создаём экземпляр Fuse с настройками
  const fuse = useMemo(() => {
    if (searchData.length === 0) {
      return null
    }
    return new Fuse(searchData, {
      keys: [
        { name: 'content', weight: 0.7 },
        { name: 'title', weight: 0.2 },
        { name: 'articleNumber', weight: 0.1 },
      ],
      includeMatches: true,
      threshold: 0.4,
      minMatchCharLength: 2,
    })
  }, [searchData])

  // Debounced запрос для оптимизации производительности
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_DELAY)

  // Результаты поиска (используем debouncedQuery)
  const results = useMemo(() => {
    if (!fuse || !debouncedQuery || debouncedQuery.length < 2) {
      return []
    }
    try {
      return fuse.search(debouncedQuery, { limit: 50 })
    } catch {
      // Ошибка поиска — возвращаем пустой массив
      return []
    }
  }, [fuse, debouncedQuery])

  // Группировка по документам с сохранением matches
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchGroup> = {}

    for (const result of results) {
      const { item, matches } = result
      const key = item.title

      if (!groups[key]) {
        groups[key] = {
          title: item.title,
          category: item.category,
          items: [],
        }
      }
      groups[key].items.push({ item, matches })
    }

    return Object.values(groups)
  }, [results])

  return {
    query,
    setQuery,
    results,
    groupedResults,
    hasResults: results.length > 0,
    isSearching: debouncedQuery.length >= 2,
    isPending: query !== debouncedQuery && query.length >= 2,
    isLoading,
    error,
  }
}
