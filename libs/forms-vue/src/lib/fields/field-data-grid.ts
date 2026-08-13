import { createLazyField } from '../core/create-lazy-field'

export type { DataGridColumnDef, DataGridFieldProps } from '../core/data-grid-types'

/**
 * FieldDataGrid (headless) — большая таблица на `@tanstack/vue-table`: сортировка, фильтрация,
 * пагинация, инлайн-редактирование, row-selection, CSV-экспорт.
 *
 * `@tanstack/vue-table` — тяжёлый peer-dep, нужный только этому полю (и `FieldTableEditor`, но
 * тот его не тянет — там native `<table>` без TanStack Table). Реализация вынесена в
 * `field-data-grid-impl.ts` и подгружается через `createLazyField` — тот же паттерн, что у
 * `FieldRichText`.
 *
 * @example
 * ```ts
 * h(FieldDataGrid, {
 *   name: 'employees',
 *   columns: [{ name: 'name', filter: true }, { name: 'salary', align: 'right' }],
 *   pageSize: 20,
 *   rowSelection: true,
 * })
 * ```
 */
export const FieldDataGrid = createLazyField(
  () => import('./field-data-grid-impl').then((m) => m.FieldDataGrid),
)
