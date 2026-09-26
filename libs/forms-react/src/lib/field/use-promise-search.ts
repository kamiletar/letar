'use client'

import type { LoadOptionsFn } from '@letar/forms-core/uikit'
import { useCallback, useEffect, useRef, useState } from 'react'
import { callLoader, isAbortError } from './abort-utils'

export interface UsePromiseSearchOptions<TData> {
  /** Загрузчик записей по строке поиска (`undefined` — путь не используется, хук простаивает) */
  loadOptions?: LoadOptionsFn<TData>
  /** Строка поиска после дебаунса и порога `minChars` — её дебаунсит `useAsyncSearch` */
  search: string
  /** Запрашивать ли сейчас (порог `minChars` пройден, список открывался) */
  enabled: boolean
  /** Ошибка загрузки — для лога или тоста; отмена запроса сюда не попадает */
  onLoadError?: (error: unknown) => void
}

export interface UsePromiseSearchResult<TData> {
  /** Результат последнего успешного запроса; при загрузке остаётся прежний, при ошибке — `undefined` */
  data: TData[] | undefined
  /** Идёт запрос для текущей строки поиска */
  isLoading: boolean
  /** Ошибка запроса для текущей строки поиска (`null` — нет) */
  error: unknown
  /** Повторить запрос с той же строкой (после ошибки; после `onCreate`/`onUpdate`) */
  reload: () => void
}

interface Settled<TData> {
  key: string
  data: TData[] | undefined
  error: unknown
}

/**
 * Промис-путь поиска Combobox: запрос на каждую (дебаунсенную) строку поиска. Свой `AbortController` на
 * запрос — новый запрос и размонтирование отменяют прошлый; применяется только результат последнего, даже если
 * загрузчик `signal` игнорирует (server action). Прошлые результаты остаются, пока идёт новый запрос.
 * Автоповторов нет. Кэша нет — его даёт `useLoaderQuery` из `@letar/forms-query`.
 */
export function usePromiseSearch<TData>(options: UsePromiseSearchOptions<TData>): UsePromiseSearchResult<TData> {
  const { loadOptions, search, enabled, onLoadError } = options

  // Идентичность загрузчика и обработчика не должна перезапускать запрос: приложения передают стрелки прямо в JSX
  const loadRef = useRef(loadOptions)
  const onErrorRef = useRef(onLoadError)
  useEffect(() => {
    loadRef.current = loadOptions
    onErrorRef.current = onLoadError
  })

  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<TData> | null>(null)
  const active = enabled && !!loadOptions
  const key = `${nonce}\u0000${search}`

  useEffect(() => {
    const load = loadRef.current
    if (!active || !load) {
      return
    }
    const controller = new AbortController()
    let stale = false
    void callLoader(() => load(search, { signal: controller.signal })).then(
      (data) => {
        if (!stale) {
          setSettled({ key, data, error: null })
        }
      },
      (error: unknown) => {
        // Устаревший запрос и отмена — не ошибка
        if (stale || controller.signal.aborted || isAbortError(error)) {
          return
        }
        setSettled({ key, data: undefined, error })
        onErrorRef.current?.(error)
      },
    )
    return () => {
      stale = true
      controller.abort()
    }
  }, [active, search, key])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  const current = settled?.key === key
  return {
    data: settled?.data,
    isLoading: active && !current,
    error: current ? settled?.error ?? null : null,
    reload,
  }
}
