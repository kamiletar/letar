'use client'

/**
 * SearchProvider — клиентский поиск аниме через Fuse.js
 *
 * Заменяет FTS5 (SQLite Full-Text Search) на in-memory поиск:
 * - Fuzzy matching (опечатки, неточный ввод)
 * - Русский стемминг через pre-processing
 * - Мгновенный отклик (~1ms vs ~10ms FTS5)
 * - Работает offline (данные в TanStack Query кэше)
 *
 * Использование:
 * ```tsx
 * const { search, results, isLoading } = useSearch()
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import Fuse, { type IFuseOptions } from 'fuse.js'
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react'

import { getSearchableAnime, type SearchableAnime, type SearchResult } from '@/app/_actions/search.action'
import { hasCyrillic, stemText } from '@/lib/stemmer'

/** Опции Fuse.js для поиска аниме */
const FUSE_OPTIONS: IFuseOptions<SearchableAnime> = {
  keys: [
    // Основные названия (высокий приоритет)
    { name: 'name', weight: 2 },
    { name: 'nameStemmed', weight: 1.8 }, // Для "головоломки" → "головоломка"
    // Оригинальное название (японское)
    { name: 'originalName', weight: 1.5 },
    // Английское название
    { name: 'nameEn', weight: 1 },
    // Альтернативные названия
    { name: 'synonyms', weight: 0.8 },
    { name: 'synonymsStemmed', weight: 0.7 },
  ],
  // Порог fuzzy matching (0 = точное совпадение, 1 = любое)
  threshold: 0.3,
  // Поиск в любом месте строки, не только с начала
  ignoreLocation: true,
  // Минимальное количество символов для поиска
  minMatchCharLength: 2,
  // Включить информацию о совпадениях (для подсветки)
  includeScore: true,
  // Extended search — поддержка оператора | для OR запросов (стемминг кириллицы)
  useExtendedSearch: true,
}

/** Контекст поиска */
interface SearchContextValue {
  /** Выполнить поиск по запросу */
  search: (query: string) => SearchResult[]
  /** Выполнить поиск и вернуть только ID */
  searchIds: (query: string) => string[]
  /** Все загруженные аниме (для других целей) */
  allAnime: SearchableAnime[]
  /** Загружается ли кэш данных */
  isLoading: boolean
  /** Ошибка загрузки */
  error: Error | null
}

const SearchContext = createContext<SearchContextValue | null>(null)

interface SearchProviderProps {
  children: ReactNode
}

/**
 * Провайдер клиентского поиска
 * Загружает все аниме при старте и кэширует через TanStack Query
 */
export function SearchProvider({ children }: SearchProviderProps) {
  // Загрузка данных для поиска
  const {
    data: anime = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['searchable-anime'],
    queryFn: getSearchableAnime,
    staleTime: 5 * 60 * 1000, // 5 минут — данные редко меняются
    gcTime: 30 * 60 * 1000, // 30 минут в кэше
  })

  // Создаём Fuse индекс при изменении данных
  const fuse = useMemo(() => {
    if (anime.length === 0) {
      return null
    }
    return new Fuse(anime, FUSE_OPTIONS)
  }, [anime])

  /**
   * Поиск по запросу
   * Возвращает результаты в формате SearchResult (совместимо с QuickSearch)
   */
  const search = useCallback(
    (query: string): SearchResult[] => {
      if (!fuse || !query || query.length < 2) {
        return []
      }

      // Для кириллицы добавляем стеммированный вариант запроса
      let searchQuery = query
      if (hasCyrillic(query)) {
        // Fuse.js поддерживает extended search с |
        const stemmed = stemText(query)
        if (stemmed !== query.toLowerCase()) {
          searchQuery = `${query} | ${stemmed}`
        }
      }

      const results = fuse.search(searchQuery, { limit: 8 })

      // Преобразуем в SearchResult
      return results.map((r) => ({
        id: r.item.id,
        name: r.item.name,
        originalName: r.item.originalName,
        posterPath: r.item.posterPath,
        year: r.item.year,
      }))
    },
    [fuse],
  )

  /**
   * Поиск только ID (для фильтров библиотеки)
   * Возвращает все совпадения без лимита
   */
  const searchIds = useCallback(
    (query: string): string[] => {
      if (!fuse || !query || query.length < 2) {
        return []
      }

      // Для кириллицы добавляем стеммированный вариант
      let searchQuery = query
      if (hasCyrillic(query)) {
        const stemmed = stemText(query)
        if (stemmed !== query.toLowerCase()) {
          searchQuery = `${query} | ${stemmed}`
        }
      }

      const results = fuse.search(searchQuery, { limit: 1000 })
      return results.map((r) => r.item.id)
    },
    [fuse],
  )

  const value = useMemo<SearchContextValue>(
    () => ({
      search,
      searchIds,
      allAnime: anime,
      isLoading,
      error: error as Error | null,
    }),
    [search, searchIds, anime, isLoading, error],
  )

  return <SearchContext value={value}>{children}</SearchContext>
}

/**
 * Хук для доступа к поиску
 * @throws Если используется вне SearchProvider
 */
export function useSearchContext(): SearchContextValue {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchContext must be used within SearchProvider')
  }
  return context
}
