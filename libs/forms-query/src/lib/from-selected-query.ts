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

/**
 * Готовый `useSelected` для `Form.Field.Combobox` из хука вида `(value, options) => UseQueryResult`:
 * запись текущего значения, которой может не быть на странице поиска (подпись в поле, карандаш, `onUpdate`).
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
export function fromSelectedQuery<TData, TResult extends SelectedQueryResultLike<TData>>(
  useHook: (value: string, options: SelectedQueryOptions) => TResult,
): (value: string) => TResult {
  return (value) => useHook(value, { enabled: !!value })
}
