'use client'

import type { LoadContext, OptionsSourceProps } from '@letar/forms-core/uikit'
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

interface Settled<TOption> {
  token: object
  options: TOption[]
  error: unknown
}

const NO_OPTIONS: never[] = []

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
): UseOptionsLoaderResult<TOption> {
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<TOption> | null>(null)
  // Новый токен на каждую смену `deps`/`reload`: по нему различаем «запрос идёт» и «результат актуален»
  // eslint-disable-next-line react-hooks/exhaustive-deps -- список зависимостей задаёт вызывающий
  const token = useMemo(() => ({}), [...deps, nonce])

  useEffect(() => {
    const controller = new AbortController()
    let stale = false
    void callLoader(() => loadRef.current({ signal: controller.signal })).then(
      (options) => {
        if (!stale) {
          setSettled({ token, options, error: null })
        }
      },
      (error: unknown) => {
        if (stale || controller.signal.aborted || isAbortError(error)) {
          return
        }
        setSettled((prev) => ({ token, options: prev?.options ?? NO_OPTIONS, error }))
      },
    )
    return () => {
      stale = true
      controller.abort()
    }
  }, [token])

  const reload = useCallback(() => setNonce((value) => value + 1), [])
  const current = settled?.token === token
  const options = settled?.options ?? NO_OPTIONS
  const loading = !current
  const fieldProps = useMemo(() => ({ options, loading }), [options, loading])

  return { fieldProps, error: current ? settled?.error ?? null : null, reload }
}
