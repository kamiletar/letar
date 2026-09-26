import type { FieldDeps } from '@letar/forms-core/uikit'
import { areQueryDepsReady, NO_DEPS } from './deps'

/** Второй аргумент хука записи выбранного значения */
export interface SelectedQueryOptions {
  /** `false` при пустом значении: запрос по пустому id не уходит */
  enabled: boolean
}

/** Результат, который понимает `useSelected` Combobox */
export interface SelectedQueryResultLike<TData> {
  data?: TData | null
  isLoading?: boolean
}

export interface FromSelectedQueryOptions {
  /** Родители «готовы» — запись можно грузить (по умолчанию все значения `deps` непустые) */
  depsReady?: (deps: FieldDeps) => boolean
}

/**
 * Готовый `useSelected` для `Form.Field.Combobox` из хука вида `(value, options) => UseQueryResult`:
 * запись текущего значения, которой может не быть на странице поиска (подпись в поле, карандаш, `onUpdate`).
 * Зависимое поле (§18.7): хук получает `deps` третьим аргументом, `enabled` учитывает готовность `deps`.
 *
 * @example
 * ```tsx
 * function useCategoryById(id: string, options: SelectedQueryOptions) {
 *   return useFindUniqueCategory({ where: { id } }, options)
 * }
 * // ...
 * useSelected={fromSelectedQuery(useCategoryById)}
 * ```
 */
export function fromSelectedQuery<
  TData,
  TResult extends SelectedQueryResultLike<TData>,
  TDeps extends FieldDeps = FieldDeps,
>(
  useHook: (value: string, options: SelectedQueryOptions, deps: TDeps) => TResult,
  { depsReady }: FromSelectedQueryOptions = {},
): (value: string, deps?: TDeps) => TResult {
  return (value, deps = NO_DEPS as TDeps) =>
    useHook(value, { enabled: !!value && areQueryDepsReady(deps, depsReady) }, deps)
}
