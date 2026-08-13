import type { CellCoord, ResolvedColumn, TableColumnDef, TableFooterDef } from '@letar/forms-core/table'
import type { VNode } from 'vue'

export type { CellCoord, CellFieldType, ResolvedColumn, TableColumnDef, TableFooterDef } from '@letar/forms-core/table'

/** Props компонента `FieldTableEditor` (headless) — то же API, что у shadcn-скина и React-версии. */
export interface TableEditorFieldProps {
  /** Имя array-поля в форме */
  name: string
  /** Лейбл таблицы */
  label?: string
  /** Определения колонок (если не указаны — авто из schema) */
  columns?: TableColumnDef[]
  /** Текст кнопки добавления */
  addLabel?: string
  /** Включить drag&drop сортировку строк (native HTML5 DnD, без dnd-kit — см. PLAN.md) */
  sortable?: boolean
  /** Включить чекбокс-выбор строк */
  selectable?: boolean
  /** Footer с агрегатами */
  footer?: TableFooterDef[]
  /** Максимум строк (override schema .max()) */
  maxRows?: number
  /** Минимум строк (override schema .min()) */
  minRows?: number
  /** Включить copy-paste из Excel/Sheets */
  clipboard?: boolean
  /** Заполнитель при пустой таблице */
  emptyText?: string
  /** Disabled */
  disabled?: boolean
  /** ReadOnly */
  readOnly?: boolean
}

/**
 * Общее состояние + колбэки, которые нужны подкомпонентам таблицы (`table-header`/`table-row`/
 * `table-footer`/`table-toolbar`/`table-cell`). Vue-аналог React `TableEditorContextValue`
 * (`libs/forms-shadcn/src/lib/table/table-editor-types.ts`), но передаётся как обычный проп
 * `controller`, не через `provide`/`inject` — пересобирается заново на каждый рендер
 * `form.Field` со свежими `field.pushValue`/`removeValue`/`moveValue`, поэтому объект и так не
 * переживает рендеры, а `provide`/`inject` не даёт для этого случая ничего сверх обычного пропа.
 */
export interface TableEditorController {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Form API `@tanstack/vue-form`
  form: any
  fullPath: string
  columns: ResolvedColumn[]
  rows: Record<string, unknown>[]
  canAdd: boolean
  canRemove: boolean
  disabled: boolean
  readOnly: boolean
  addRow: () => void
  removeRow: (index: number) => void
  moveRow: (from: number, to: number) => void
  editingCell: CellCoord | null
  setEditingCell: (cell: CellCoord | null) => void
  setFocusedCell: (cell: CellCoord | null) => void
  selectedRows: Set<number>
  toggleRowSelection: (index: number) => void
  toggleSelectAll: () => void
  sortable: boolean
  dragOverRowIndex: number | null
  onRowDragStart: (rowIndex: number) => void
  onRowDragOver: (rowIndex: number) => void
  onRowDrop: (rowIndex: number) => void
}

export type ToolbarActionsSlot = (() => VNode | VNode[] | null) | undefined
