/**
 * Контракт асинхронных источников данных Select/Combobox (этап Г программы `forms-select-render-onupdate`).
 * Framework-free: типы, которые разделяют оба скина и пакет `@letar/forms-query`.
 */

/** Контекст запроса: отмена приходит, когда запрос устарел (новый ввод) или поле размонтировано */
export interface LoadContext {
  signal: AbortSignal
}

/**
 * Записи по строке поиска. `TData[]`, а не готовые опции: подписи, значения и группы берутся теми же
 * `getLabel`/`getValue`/`getGroup`/`getDisabled`, что и у хук-пути (`useQuery`).
 */
export type LoadOptionsFn<TData> = (search: string, ctx: LoadContext) => Promise<TData[]>

/** Запись выбранного значения по `value` (пара к `useSelected` хук-пути); `null` — записи нет */
export type LoadSelectedFn<TData> = (value: string, ctx: LoadContext) => Promise<TData | null>

/**
 * То, что одинаково понимают Select и Combobox со статичными `options`: результат любого источника
 * (хук, промис) в форме, которую можно распылить в поле — `<Field.Select {...source.fieldProps} />`.
 */
export interface OptionsSourceProps<TOption> {
  options: TOption[]
  loading: boolean
}
