import type { FieldDeps, LoadOptionsFn } from '@letar/forms-core/uikit'
import { keepPreviousData, type QueryKey, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { areQueryDepsReady, NO_DEPS } from './deps'

export interface UseLoaderQueryOptions {
  /** Порог символов для запроса (по умолчанию 1) */
  minChars?: number
  /** Сколько выдача считается свежей, мс: повтор той же строки за это время не идёт в сеть (по умолчанию 30 000) */
  staleTime?: number
  /**
   * Родители «готовы» — запрос можно слать (§18.7). По умолчанию все значения `deps` непустые — то же правило, что у
   * поля; своя `depsReady` поля (проп) должна совпадать с этой настройкой.
   */
  depsReady?: (deps: FieldDeps) => boolean
}

/**
 * Промис-загрузчик Combobox (`loadOptions`: server action, `fetch`, SDK) → `useQuery` с ключом.
 * Даёт то, чего у голого `loadOptions` нет: кэш (повтор строки в течение `staleTime` не идёт в сеть),
 * дедупликацию и инвалидацию по ключу из любого места приложения. Ключ запроса — `[...key, deps, search]`; в
 * загрузчик приходит `{ signal, deps }`, `signal` — из TanStack Query.
 *
 * Зависимое поле (`dependsOn`, §18.7): поле зовёт результат как `useQuery(search, deps)`. Смена `deps` — новый
 * запрос, возврат к прежним `deps` — из кэша; пока родитель пуст, запрос не уходит. Без `dependsOn` `deps` — `{}`.
 *
 * ⚠️ Ключ запроса изменился (элемент `deps` перед строкой поиска): `invalidateQueries({ queryKey: key })` по
 * префиксу работает как раньше, а точный ключ `[...key, search]` теперь `[...key, {}, search]`.
 *
 * @example
 * ```tsx
 * <Form.Field.Combobox
 *   name="userId"
 *   useQuery={useLoaderQuery(['users'], (search, { signal }) => searchUsers({ search }, signal))}
 *   getLabel={(u) => u.name}
 *   getValue={(u) => u.id}
 * />
 * // после мутации: queryClient.invalidateQueries({ queryKey: ['users'] })
 *
 * // зависимое поле: загрузчик получает deps родителей
 * useLoaderQuery(['cities'], (search, { signal, deps }) => searchCities({ search, countryId: deps.countryId }, signal))
 * ```
 */
export function useLoaderQuery<TData, TDeps extends FieldDeps = FieldDeps>(
  key: QueryKey,
  load: LoadOptionsFn<TData, TDeps>,
  { minChars = 1, staleTime = 30_000, depsReady }: UseLoaderQueryOptions = {},
): (search: string, deps?: TDeps) => UseQueryResult<TData[]> {
  // Внутренняя функция — хук: её вызывает Combobox на каждом рендере, как любой колбэк `useQuery`
  return function useSearchQuery(search, deps = NO_DEPS as TDeps) {
    return useQuery({
      queryKey: [...key, deps, search],
      queryFn: ({ signal }) => load(search, { signal, deps }),
      enabled: search.length >= minChars && areQueryDepsReady(deps, depsReady),
      staleTime,
      placeholderData: keepPreviousData,
    })
  }
}
