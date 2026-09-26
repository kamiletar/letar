import type { FieldDeps } from '@letar/forms-core/uikit'
import { keepPreviousData } from '@tanstack/react-query'
import { areQueryDepsReady, NO_DEPS } from './deps'

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
  /**
   * Родители «готовы» — запрос можно слать (§18.7). По умолчанию все значения `deps` непустые — то же правило, что у
   * поля. Своя `depsReady` поля (проп) должна совпадать с этой настройкой: поле передаёт хуку только `deps`.
   */
  depsReady?: (deps: FieldDeps) => boolean
}

/**
 * Готовый `useQuery` для `Form.Field.Combobox` из хука вида `(search, options) => UseQueryResult`.
 * Добавляет две оговорки хук-пути, о которых легко забыть: `enabled` по `minChars` (иначе запрос уходит
 * с пустой строкой на каждом монтировании) и `placeholderData: keepPreviousData` (иначе список мигает
 * при каждом символе).
 *
 * Зависимые поля (`dependsOn`, §18.7): поле зовёт результат как `useQuery(search, deps)`, хук получает `deps`
 * третьим аргументом, а `enabled` учитывает и готовность `deps` — пока родитель пуст, запрос не уходит. Хуки
 * без третьего аргумента работают как раньше.
 *
 * @example
 * ```tsx
 * // Хук — на уровне модуля (правило хуков не разрешает вызывать его внутри стрелки в JSX)
 * function useCategorySearch(search: string, options: SearchQueryOptions) {
 *   return useFindManyCategory({ where: { name: { contains: search, mode: 'insensitive' } }, take: 20 }, options)
 * }
 * const searchCategories = fromSearchQuery(useCategorySearch)
 *
 * // Зависимое поле: deps — третий аргумент хука
 * function useCitySearch(search: string, options: SearchQueryOptions, deps: { countryId?: string }) {
 *   return useFindManyCity({ where: { countryId: deps.countryId, name: { contains: search } }, take: 20 }, options)
 * }
 *
 * <Form.Field.Combobox
 *   name="categoryId"
 *   useQuery={searchCategories}
 *   getLabel={(c) => c.name}
 *   getValue={(c) => c.id}
 * />
 * ```
 */
export function fromSearchQuery<TData, TResult extends QueryResultLike<TData>, TDeps extends FieldDeps = FieldDeps>(
  useHook: (search: string, options: SearchQueryOptions, deps: TDeps) => TResult,
  { minChars = 1, depsReady }: FromSearchQueryOptions = {},
): (search: string, deps?: TDeps) => TResult {
  return (search, deps = NO_DEPS as TDeps) =>
    useHook(
      search,
      {
        enabled: search.length >= minChars && areQueryDepsReady(deps, depsReady),
        placeholderData: keepPreviousData,
      },
      deps,
    )
}
