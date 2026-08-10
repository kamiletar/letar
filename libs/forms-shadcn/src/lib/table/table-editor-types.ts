'use client'

import type {
  CellCoord,
  ResolvedColumn,
  TableColumnDef,
  TableFooterDef,
  TableNavigationState,
} from '@letar/forms-core/table'
import type { ReactNode } from 'react'

/** Props компонента Form.Field.TableEditor — shadcn-скин (то же API, что у Chakra-версии). */
export interface TableEditorFieldProps {
  /** Имя array-поля в форме */
  name: string
  /** Лейбл таблицы */
  label?: string
  /** Определения колонок (если не указаны — авто из schema) */
  columns?: TableColumnDef[]
  /** Текст кнопки добавления */
  addLabel?: string
  /** Включить drag&drop сортировку строк (native HTML5 DnD, без dnd-kit — см. README) */
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
  /** Размер таблицы (влияет на padding ячеек) */
  size?: 'sm' | 'md' | 'lg'
  /** Вертикальная полоса для наведения */
  striped?: boolean
  /** Кастомные действия для toolbar */
  toolbarActions?: ReactNode
  /** Helper text под таблицей */
  helperText?: string
  /** Disabled */
  disabled?: boolean
  /** ReadOnly */
  readOnly?: boolean
}

/** Значение контекста TableEditor */
export interface TableEditorContextValue {
  columns: ResolvedColumn[]
  rows: Record<string, unknown>[]
  fullPath: string
  canAdd: boolean
  canRemove: boolean
  addRow: () => void
  removeRow: (index: number) => void
  moveRow: (from: number, to: number) => void
  navigation: TableNavigationState
  setEditingCell: (cell: CellCoord | null) => void
  setFocusedCell: (cell: CellCoord | null) => void
  selectedRows: Set<number>
  toggleRowSelection: (index: number) => void
  toggleSelectAll: () => void
  disabled: boolean
  readOnly: boolean
  size: 'sm' | 'md' | 'lg'
}
