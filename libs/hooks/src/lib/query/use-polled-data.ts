'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Опции хука usePolledData */
export interface UsePolledDataOptions {
  /** Интервал опроса в миллисекундах */
  intervalMs: number
  /** Дополнительно перезагружать данные при возврате фокуса на окно */
  refetchOnFocus?: boolean
  /** Включён ли опрос — при false интервал и загрузка приостанавливаются */
  enabled?: boolean
}

/** Результат хука usePolledData */
export interface UsePolledDataResult<T> {
  /** Загруженные данные */
  data: T | null
  /** Флаг первой/текущей загрузки */
  loading: boolean
  /** Ручной перезапуск загрузки */
  refetch: () => Promise<void>
}

/**
 * Generic хук для периодического опроса данных (polling).
 * Используется для карточек Sidebar, которым нужно регулярно синхронизироваться
 * с состоянием на диске/сервере (прогресс просмотра, рекомендации и т.п.)
 *
 * @example
 * ```tsx
 * const { data, loading } = usePolledData(findGlobalLastWatched, {
 *   intervalMs: 30000,
 *   refetchOnFocus: true,
 *   enabled: !isOnWatchPage,
 * })
 * ```
 */
export function usePolledData<T>(fetchFn: () => Promise<T>, options: UsePolledDataOptions): UsePolledDataResult<T> {
  const { intervalMs, refetchOnFocus = false, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  // fetchFn может пересоздаваться на каждый рендер вызывающего компонента —
  // держим последнюю версию в ref, чтобы не пересоздавать интервал/листенер
  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  const load = useCallback(async () => {
    try {
      const result = await fetchFnRef.current()
      setData(result)
    } catch (error) {
      console.error('[usePolledData] Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    load()

    const interval = setInterval(load, intervalMs)

    const handleFocus = () => {
      load()
    }
    if (refetchOnFocus) {
      window.addEventListener('focus', handleFocus)
    }

    return () => {
      clearInterval(interval)
      if (refetchOnFocus) {
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [enabled, intervalMs, refetchOnFocus, load])

  return { data, loading, refetch: load }
}
