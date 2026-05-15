'use client'

import type { DependencyList } from 'react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Результат хука useApiSuggestions
 */
export interface ApiSuggestionsResult<T> {
  /** Загруженные данные */
  data: T[]
  /** Флаг загрузки */
  isLoading: boolean
  /** Ошибка загрузки */
  error: Error | null
}

/**
 * Generic хук для загрузки suggestions из API.
 * Используется для автокомплитов (марки авто, модели, города и т.д.)
 *
 * @param fetchFn - Функция загрузки данных
 * @param dependencies - Зависимости для перезагрузки
 *
 * @example
 * ```tsx
 * // Загрузка списка брендов для автокомплита
 * const { data: brands, isLoading } = useApiSuggestions(
 *   () => fetch('/api/vehicles/brands').then(r => r.json()),
 *   []
 * )
 *
 * // С зависимостью от категории
 * const { data: models } = useApiSuggestions(
 *   () => fetch(`/api/vehicles/models?brandId=${brandId}`).then(r => r.json()),
 *   [brandId]
 * )
 * ```
 */
export function useApiSuggestions<T>(
  fetchFn: () => Promise<T[]>,
  dependencies: DependencyList = []
): ApiSuggestionsResult<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Мемоизируем fetchFn, чтобы предотвратить бесконечные циклы (dependencies переданы явно)
  const stableFetchFn = useCallback(fetchFn, dependencies)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await stableFetchFn()
        if (!cancelled) {
          setData(result)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error('Ошибка загрузки'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [stableFetchFn])

  return { data, isLoading, error }
}
