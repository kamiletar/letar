'use client'

import type { FieldDeps, LoadOptionsFn } from '@letar/forms-core/uikit'
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
  /** Значения родителей (`dependsOn`, §18) — уходят в `ctx.deps`; по умолчанию `{}` */
  deps?: FieldDeps
  /** Ключ зависимостей (`serializeDeps`): смена — новый запрос, прежние опции чужого родителя не остаются */
  depsKey?: string
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
  /** Ключ зависимостей ответа: данные другого родителя не показываем, даже пока идёт новый запрос */
  depsKey: string
  data: TData[] | undefined
  error: unknown
}

const NO_DEPS: FieldDeps = {}

/**
 * Промис-путь поиска Combobox: запрос на каждую (дебаунсенную) строку поиска. Свой `AbortController` на
 * запрос — новый запрос и размонтирование отменяют прошлый; применяется только результат последнего, даже если
 * загрузчик `signal` игнорирует (server action). Прошлые результаты остаются, пока идёт новый запрос.
 * Автоповторов нет. Кэша нет — его даёт `useLoaderQuery` из `@letar/forms-query`.
 */
export function usePromiseSearch<TData>(options: UsePromiseSearchOptions<TData>): UsePromiseSearchResult<TData> {
  const { loadOptions, search, enabled, onLoadError, deps = NO_DEPS, depsKey = '' } = options

  // Идентичность загрузчика и обработчика не должна перезапускать запрос: приложения передают стрелки прямо в JSX
  const loadRef = useRef(loadOptions)
  const onErrorRef = useRef(onLoadError)
  const depsRef = useRef(deps)
  useEffect(() => {
    loadRef.current = loadOptions
    onErrorRef.current = onLoadError
    depsRef.current = deps
  })

  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<TData> | null>(null)
  const active = enabled && !!loadOptions
  const key = `${nonce}\u0000${depsKey}\u0000${search}`

  useEffect(() => {
    const load = loadRef.current
    if (!active || !load) {
      return
    }
    const controller = new AbortController()
    let stale = false
    void callLoader(() => load(search, { signal: controller.signal, deps: depsRef.current })).then(
      (data) => {
        if (!stale) {
          setSettled({ key, depsKey, data, error: null })
        }
      },
      (error: unknown) => {
        // Устаревший запрос и отмена — не ошибка
        if (stale || controller.signal.aborted || isAbortError(error)) {
          return
        }
        setSettled({ key, depsKey, data: undefined, error })
        onErrorRef.current?.(error)
      },
    )
    return () => {
      stale = true
      controller.abort()
    }
  }, [active, search, key, depsKey])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  const current = settled?.key === key
  // Прежние результаты остаются, пока идёт новый запрос по той же строке родителя; ответ другого родителя — нет
  const sameDeps = settled?.depsKey === depsKey
  return {
    data: sameDeps ? settled?.data : undefined,
    isLoading: active && !current,
    error: current ? settled?.error ?? null : null,
    reload,
  }
}
