'use client'

import type { LoadSelectedFn } from '@letar/forms-core/uikit'
import { useCallback, useEffect, useRef, useState } from 'react'
import { callLoader, isAbortError } from './abort-utils'

export interface UseSelectedLoaderOptions<TData> {
  /** Загрузчик записи по значению (`undefined` — путь не используется) */
  loadSelected?: LoadSelectedFn<TData>
  /** Текущее значение поля (пустая строка — ничего не выбрано) */
  value: string
  /** Нужна ли догрузка сейчас: значения нет в текущих результатах и нет `initialLabel` */
  enabled: boolean
  onLoadError?: (error: unknown) => void
}

export interface UseSelectedLoaderResult<TData> {
  /** Запись значения (`null` — загрузчик сказал, что записи нет; `undefined` — ещё не загружена) */
  data: TData | null | undefined
  isLoading: boolean
  /** Сбросить закэшированную запись значения — после `onUpdate` этой записи (прежняя остаётся до ответа) */
  invalidate: (value: string) => void
}

interface CacheEntry<TData> {
  data: TData | null
  fresh: boolean
}

/**
 * Догрузка записи выбранного значения промисом. Результаты по значению хранятся в экземпляре поля — иначе
 * запрос уходил бы на каждое открытие; `invalidate` помечает запись устаревшей, прежнее значение остаётся на
 * экране, пока не придёт новое. Отмена запроса — при смене значения и размонтировании.
 */
export function useSelectedLoader<TData>(options: UseSelectedLoaderOptions<TData>): UseSelectedLoaderResult<TData> {
  const { loadSelected, value, enabled, onLoadError } = options

  const loadRef = useRef(loadSelected)
  const onErrorRef = useRef(onLoadError)
  useEffect(() => {
    loadRef.current = loadSelected
    onErrorRef.current = onLoadError
  })

  const [cache, setCache] = useState<Record<string, CacheEntry<TData>>>({})
  const entry = value ? cache[value] : undefined
  const needsLoad = enabled && !!loadSelected && !!value && (!entry || !entry.fresh)

  useEffect(() => {
    const load = loadRef.current
    if (!needsLoad || !load) {
      return
    }
    const controller = new AbortController()
    let stale = false
    void callLoader(() => load(value, { signal: controller.signal })).then(
      (data) => {
        if (!stale) {
          setCache((prev) => ({ ...prev, [value]: { data, fresh: true } }))
        }
      },
      (error: unknown) => {
        if (stale || controller.signal.aborted || isAbortError(error)) {
          return
        }
        onErrorRef.current?.(error)
      },
    )
    return () => {
      stale = true
      controller.abort()
    }
  }, [needsLoad, value])

  const invalidate = useCallback((target: string) => {
    setCache((prev) => {
      const existing = prev[target]
      return existing && existing.fresh ? { ...prev, [target]: { ...existing, fresh: false } } : prev
    })
  }, [])

  return { data: entry?.data, isLoading: needsLoad, invalidate }
}
