import type { LoadOptionsFn } from '@letar/forms-core/uikit'
import { keepPreviousData, type QueryKey, useQuery, type UseQueryResult } from '@tanstack/react-query'

export interface UseLoaderQueryOptions {
  /** Порог символов для запроса (по умолчанию 1) */
  minChars?: number
  /** Сколько выдача считается свежей, мс: повтор той же строки за это время не идёт в сеть (по умолчанию 30 000) */
  staleTime?: number
}

/**
 * Промис-загрузчик Combobox (`loadOptions`: server action, `fetch`, SDK) → `useQuery` с ключом.
 * Даёт то, чего у голого `loadOptions` нет: кэш (повтор строки в течение `staleTime` не идёт в сеть),
 * дедупликацию и инвалидацию по ключу из любого места приложения. Ключ запроса — `[...key, search]`; `signal` из
 * TanStack Query доходит до загрузчика.
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
 * ```
 */
export function useLoaderQuery<TData>(
  key: QueryKey,
  load: LoadOptionsFn<TData>,
  { minChars = 1, staleTime = 30_000 }: UseLoaderQueryOptions = {},
): (search: string) => UseQueryResult<TData[]> {
  // Внутренняя функция — хук: её вызывает Combobox на каждом рендере, как любой колбэк `useQuery`
  return function useSearchQuery(search) {
    return useQuery({
      queryKey: [...key, search],
      queryFn: ({ signal }) => load(search, { signal }),
      enabled: search.length >= minChars,
      staleTime,
      placeholderData: keepPreviousData,
    })
  }
}
