'use client'

import type { FieldDeps, LoadContext, OptionsSourceProps } from '@letar/forms-core/uikit'
import { type DependencyList, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { callLoader, isAbortError } from './abort-utils'

export interface UseOptionsLoaderResult<TOption> {
  /** Распыляется в поле: `<Field.Select {...regions.fieldProps} />` */
  fieldProps: OptionsSourceProps<TOption>
  /** Ошибка последней загрузки (`null` — нет); её показывает приложение — свой текст и повтор через `reload` */
  error: unknown
  /** Загрузить заново с теми же `deps` */
  reload: () => void
}

export interface UseOptionsLoaderOptions {
  /**
   * При смене `deps` показывать прежние опции, пока идёт запрос (по умолчанию `true`). Для зависимых полей —
   * `false`: опции прежнего родителя чужие, их нельзя выбрать. На `reload` прежние опции остаются всегда.
   */
  keepPrevious?: boolean
  /** Значения родителей (`dependsOn`, §18) — уходят в `ctx.deps`; по умолчанию `{}` */
  fieldDeps?: FieldDeps
  /**
   * Загружать ли сейчас (по умолчанию `true`). Зависимое поле с неготовыми родителями (§18.3) не шлёт запрос:
   * `loading: false`, опций нет. Смена на `true` — запрос.
   */
  enabled?: boolean
}

interface Settled<TOption> {
  token: object
  depsToken: object
  options: TOption[]
  error: unknown
}

const NO_OPTIONS: never[] = []
const NO_FIELD_DEPS: FieldDeps = {}

/**
 * Разовая загрузка списка промисом для Select и Combobox со статичными `options` (server action, `fetch`, SDK):
 * запрос на смену `deps` и на `reload`, отмена при смене `deps` и размонтировании, гонок нет (применяется
 * результат последнего запроса), кэша нет. Пока идёт запрос, прежние опции остаются, `loading: true`.
 *
 * Для поиска по строке — `loadOptions` у Combobox, а не этот хук.
 */
export function useOptionsLoader<TOption>(
  load: (ctx: LoadContext) => Promise<TOption[]>,
  deps: DependencyList,
  { keepPrevious = true, fieldDeps = NO_FIELD_DEPS, enabled = true }: UseOptionsLoaderOptions = {},
): UseOptionsLoaderResult<TOption> {
  const loadRef = useRef(load)
  const fieldDepsRef = useRef(fieldDeps)
  useEffect(() => {
    loadRef.current = load
    fieldDepsRef.current = fieldDeps
  })

  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<TOption> | null>(null)
  // Новый токен на каждую смену `deps`/`reload`: по нему различаем «запрос идёт» и «результат актуален»
  // eslint-disable-next-line react-hooks/exhaustive-deps -- список зависимостей задаёт вызывающий
  const depsToken = useMemo(() => ({}), deps)
  const token = useMemo(() => ({}), [depsToken, nonce])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const controller = new AbortController()
    let stale = false
    void callLoader(() => loadRef.current({ signal: controller.signal, deps: fieldDepsRef.current })).then(
      (options) => {
        if (!stale) {
          setSettled({ token, depsToken, options, error: null })
        }
      },
      (error: unknown) => {
        if (stale || controller.signal.aborted || isAbortError(error)) {
          return
        }
        setSettled((prev) => ({ token, depsToken, options: prev?.options ?? NO_OPTIONS, error }))
      },
    )
    return () => {
      stale = true
      controller.abort()
    }
  }, [token, depsToken, enabled])

  const reload = useCallback(() => setNonce((value) => value + 1), [])
  const current = settled?.token === token
  const options = settled && (keepPrevious || settled.depsToken === depsToken) ? settled.options : NO_OPTIONS
  const loading = enabled && !current
  const fieldProps = useMemo(() => ({ options, loading }), [options, loading])

  return { fieldProps, error: current ? settled?.error ?? null : null, reload }
}
