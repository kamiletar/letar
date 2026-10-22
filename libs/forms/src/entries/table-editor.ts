/**
 * `@letar/forms/table-editor` — редактируемая таблица (ячейки, вставка из Excel, перетаскивание строк).
 * Нужны `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
 *
 * Подключается в `createForm`. ⚠️ Ключ обязан совпадать с именем поля: `TableEditor`.
 *
 * @example
 * ```tsx
 * import { createForm } from '@letar/forms'
 * import { FieldTableEditor } from '@letar/forms/table-editor'
 *
 * export const AppForm = createForm({ extraFields: { TableEditor: FieldTableEditor } })
 *
 * <AppForm.Field.TableEditor name="items" columns={columns} />
 * ```
 */
export { FieldTableEditor, TableEditorContext, useTableEditorContext } from '../lib/declarative/form-fields/table'
export type {
  CellCoord,
  CellFieldType,
  ResolvedColumn,
  TableColumnDef,
  TableEditorContextValue,
  TableEditorFieldProps,
  TableFooterDef,
  TableNavigationState,
} from '../lib/declarative/form-fields/table'
