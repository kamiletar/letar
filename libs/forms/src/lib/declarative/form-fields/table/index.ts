import { createLazyComponent } from '../../lazy-component'
// Только типы реализаций: без явного параметра `createLazyComponent` выводит `ComponentType<any>`
import type { FieldDataGrid as FieldDataGridImpl } from './field-data-grid'
import type { FieldTableEditor as FieldTableEditorImpl } from './field-table-editor'

// Типы не тянут рантайм-импорт @tanstack/react-table|react-virtual — стираются при компиляции
export type { DataGridColumnDef, DataGridFieldProps } from './field-data-grid'

/**
 * Form.Field.DataGrid — `@tanstack/react-table` + `@tanstack/react-virtual` тяжёлые peer-deps,
 * нужные только этому полю. Подгружается через `lazy()` + dynamic `import()` — потребители
 * остальных табличных/text-полей не обязаны резолвить эти пакеты.
 */
export const FieldDataGrid = createLazyComponent<typeof FieldDataGridImpl>(
  () => import('./field-data-grid').then((m) => ({ default: m.FieldDataGrid })),
  '200px',
)

/** Form.Field.TableEditor — тот же lazy-паттерн, тот же барrel, что и FieldDataGrid выше. */
export const FieldTableEditor = createLazyComponent<typeof FieldTableEditorImpl>(
  () => import('./field-table-editor').then((m) => ({ default: m.FieldTableEditor })),
  '150px',
)

export { TableEditorContext, useTableEditorContext } from './table-editor-context'
export type {
  CellCoord,
  CellFieldType,
  ResolvedColumn,
  TableColumnDef,
  TableEditorContextValue,
  TableEditorFieldProps,
  TableFooterDef,
  TableNavigationState,
} from './table-types'
export { buildTSV, coerceValue, computeAggregate, formatCellValue, getDefaultRow, parseTSV } from './table-utils'
export { useTableColumns } from './use-table-columns'
