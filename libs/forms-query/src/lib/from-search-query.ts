import { keepPreviousData } from '@tanstack/react-query'

/**
 * Второй аргумент хука поиска: то, что нужно `useQuery`, чтобы Combobox с `useQuery` вёл себя правильно.
 * Пробрасывается в опции запроса как есть — `useFindManyX(args, options)` у ZenStack, `useQuery({ ...options })`.
 */
export interface SearchQueryOptions {
  /** `false`, пока строка короче `minChars`: запрос не уходит (хук всё равно вызывается на каждом рендере) */
  enabled: boolean
  /** Прошлая выдача остаётся на экране, пока идёт запрос по новой строке */
  placeholderData: typeof keepPreviousData
}

/** Результат, который понимает Combobox (`useQuery`): подходит `UseQueryResult` любой версии v5 */
export interface QueryResultLike<TData> {
  data?: TData[]
  isLoading?: boolean
  error?: Error | null
}

export interface FromSearchQueryOptions {
  /** Порог символов для запроса (по умолчанию 1 — как `minChars` Combobox) */
  minChars?: number
}

/**
 * Готовый `useQuery` для `Form.Field.Combobox` из хука вида `(search, options) => UseQueryResult`.
 * Добавляет две оговорки хук-пути, о которых легко забыть: `enabled` по `minChars` (иначе запрос уходит
 * с пустой строкой на каждом монтировании) и `placeholderData: keepPreviousData` (иначе список мигает
 * при каждом символе).
 *
 * @example
 * ```tsx
 * <Form.Field.Combobox
 *   name="categoryId"
 *   useQuery={fromSearchQuery((search, options) =>
 *     useFindManyCategory({ where: { name: { contains: search, mode: 'insensitive' } }, take: 20 }, options)
 *   )}
 *   getLabel={(c) => c.name}
 *   getValue={(c) => c.id}
 * />
 * ```
 */
export function fromSearchQuery<TData, TResult extends QueryResultLike<TData>>(
  useHook: (search: string, options: SearchQueryOptions) => TResult,
  { minChars = 1 }: FromSearchQueryOptions = {},
): (search: string) => TResult {
  return (search) => useHook(search, { enabled: search.length >= minChars, placeholderData: keepPreviousData })
}
