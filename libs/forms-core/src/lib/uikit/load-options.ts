/**
 * Контракт асинхронных источников данных Select/Combobox (этап Г программы `forms-select-render-onupdate`).
 * Framework-free: типы, которые разделяют оба скина и пакет `@letar/forms-query`.
 */

import type { FieldDeps } from './dependent-fields'

/**
 * Контекст запроса: отмена приходит, когда запрос устарел (новый ввод) или поле размонтировано.
 * `deps` — значения родителей из `dependsOn` (§18); без `dependsOn` — `{}`.
 */
export interface LoadContext<TDeps extends FieldDeps = FieldDeps> {
  signal: AbortSignal
  deps: TDeps
}

/**
 * Записи по строке поиска. `TData[]`, а не готовые опции: подписи, значения и группы берутся теми же
 * `getLabel`/`getValue`/`getGroup`/`getDisabled`, что и у хук-пути (`useQuery`).
 */
export type LoadOptionsFn<TData, TDeps extends FieldDeps = FieldDeps> = (
  search: string,
  ctx: LoadContext<TDeps>,
) => Promise<TData[]>

/** Запись выбранного значения по `value` (пара к `useSelected` хук-пути); `null` — записи нет */
export type LoadSelectedFn<TData, TDeps extends FieldDeps = FieldDeps> = (
  value: string,
  ctx: LoadContext<TDeps>,
) => Promise<TData | null>

/**
 * То, что одинаково понимают Select и Combobox со статичными `options`: результат любого источника
 * (хук, промис) в форме, которую можно распылить в поле — `<Field.Select {...source.fieldProps} />`.
 */
export interface OptionsSourceProps<TOption> {
  options: TOption[]
  loading: boolean
}
