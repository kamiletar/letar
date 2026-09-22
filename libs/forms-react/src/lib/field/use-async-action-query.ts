'use client'

import { useEffect, useState } from 'react'
import type { AsyncQueryFn, AsyncQueryResult } from './use-async-search'

/**
 * Адаптирует произвольную async-функцию поиска (server action, вызов `@fuzzy` через Prisma и
 * т.п.) под `AsyncQueryFn` — форму, которую ожидает `useQuery` у `Form.Field.Combobox`/
 * `useAsyncSearch` (`{ data, isLoading, error }`, вызывается как хук на каждый рендер).
 *
 * ZenStack-хуки (`useFindManyUser`) уже сами возвращают такую форму и подключаются напрямую
 * (`useQuery={(search) => useFindManyUser(...)}`), эта обёртка им не нужна. Она нужна только
 * когда источник данных — плоская async-функция без собственного хука: без неё пару
 * `useState`+`useEffect`+cancel-флаг устаревшего запроса приходится копипастить вручную на
 * каждый новый combobox (см. `useClientSearchOptions` в domwellbes — тот же скелет был написан
 * трижды подряд под разные источники, прежде чем стать общим хелпером здесь).
 *
 * @param search - Текущая (уже задебаунсенная) поисковая строка — приходит от `useAsyncSearch`
 * @param action - Async-функция поиска, например server action `(search) => Promise<Item[]>`
 * @param options.minChars - Минимальная длина `search`, с которой запрос реально уходит
 * (по умолчанию 1 — старое поведение, пустая строка не бьёт в action). `0` — для comboboxes,
 * которые должны показывать список сразу по клику, ещё до ввода: `useAsyncSearch` с
 * `minChars={0}` передаёт сюда честную пустую строку (не служебный признак «не спрашивать»,
 * им остаётся только фактическая длина `search` — иначе от «gate closed» её было бы не отличить).
 *
 * @example
 * ```tsx
 * <Form.Field.Combobox
 *   name="materialId"
 *   useQuery={(search) => useAsyncActionQuery(search, searchMaterialsAction)}
 *   getLabel={(m) => m.name}
 *   getValue={(m) => m.id}
 * />
 * ```
 */
export function useAsyncActionQuery<TData = unknown>(
  search: string,
  action: (search: string) => Promise<TData[]>,
  options?: { minChars?: number },
): AsyncQueryResult<TData> {
  const { minChars = 1 } = options ?? {}
  const shouldQuery = search.length >= minChars
  const [data, setData] = useState<TData[]>()
  const [error, setError] = useState<Error | null>(null)
  // Последний поисковый запрос, для которого уже пришёл ответ (успешный или с ошибкой) —
  // сравнение с `search` ниже даёт `isLoading` без единого синхронного `setState` в теле
  // эффекта (`react(set-state-in-effect)` у oxlint не пропускает даже привычное «выставить
  // isLoading перед стартом fetch» — обе мутации состояния случаются только внутри
  // `.then()`/`.catch()`, то есть уже после асинхронного разрыва, а не синхронно при выполнении
  // эффекта). Тот же приём, что в `useClientSearchOptions` (domwellbes).
  const [completedSearch, setCompletedSearch] = useState<string>()

  useEffect(() => {
    if (!shouldQuery) {
      return
    }

    let cancelled = false
    action(search)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setError(null)
          setCompletedSearch(search)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setCompletedSearch(search)
        }
      })

    return () => {
      cancelled = true
    }
  }, [search, action, shouldQuery])

  return {
    data: shouldQuery ? data : undefined,
    isLoading: shouldQuery && search !== completedSearch,
    error,
  }
}

/**
 * Оборачивает async-функцию поиска в готовый `AsyncQueryFn` для `useQuery`-пропа —
 * без ручной инлайн-стрелки `(search) => useAsyncActionQuery(search, action)` на каждом
 * combobox. Сам не является хуком (не вызывает хуки напрямую), но всегда возвращает один и тот
 * же по структуре вызовов хук-конформный колбэк — так же, как уже работает
 * `useQuery={(search) => useFindManyUser(...)}` для ZenStack-хуков.
 *
 * @param options.minChars - см. `useAsyncActionQuery` — прокинуть `0` для combobox, который
 * должен предлагать список сразу, ещё до ввода (сам `<Form.Field.Combobox minChars={0} />`
 * гейтит только подсказку «введите ещё N символов», за реальный запрос отвечает эта опция).
 *
 * @example
 * ```tsx
 * <Form.Field.Combobox
 *   name="materialId"
 *   useQuery={createAsyncActionQuery(searchMaterialsAction)}
 *   getLabel={(m) => m.name}
 *   getValue={(m) => m.id}
 * />
 * ```
 */
export function createAsyncActionQuery<TData = unknown>(
  action: (search: string) => Promise<TData[]>,
  options?: { minChars?: number },
): AsyncQueryFn<TData> {
  return (search: string) => useAsyncActionQuery(search, action, options)
}
