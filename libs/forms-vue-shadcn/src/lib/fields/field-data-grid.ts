import { createLazyField } from '@letar/forms-vue/core'

export type { DataGridColumnDef, DataGridFieldProps } from '@letar/forms-vue/core'

/**
 * FieldDataGrid (Reka-скин) — большая таблица на `@tanstack/vue-table`: сортировка, фильтрация,
 * пагинация, инлайн-редактирование, row-selection, CSV-экспорт.
 *
 * `@tanstack/vue-table` — тяжёлый peer-dep, нужный только этому полю. Реализация вынесена в
 * `field-data-grid-impl.ts` и подгружается через `createLazyField` (`@letar/forms-vue/core`) —
 * тот же паттерн, что у `FieldRichText`.
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
