/**
 * `@letar/forms/data-grid` — табличное поле с виртуализацией. Нужны `@tanstack/react-table` и `@tanstack/react-virtual`.
 *
 * Подключается в `createForm`. ⚠️ Ключ обязан совпадать с именем поля: `DataGrid`.
 *
 * @example
 * ```tsx
 * import { createForm } from '@letar/forms'
 * import { FieldDataGrid } from '@letar/forms/data-grid'
 *
 * export const AppForm = createForm({ extraFields: { DataGrid: FieldDataGrid } })
 *
 * <AppForm.Field.DataGrid name="rows" columns={columns} />
 * ```
 */
export { FieldDataGrid } from '../lib/declarative/form-fields/table'
export type { DataGridColumnDef, DataGridFieldProps } from '../lib/declarative/form-fields/table'
