'use client'

import type { ReactNode } from 'react'

/**
 * Чистые типы (без React/Chakra) вынесены в @letar/forms-core (Фаза 7.1, Этап 3в) —
 * этот файл реэкспортирует их, чтобы публичный путь не менялся для потребителей.
 */
export type {
  CellCoord,
  CellFieldType,
  ResolvedColumn,
  TableColumnDef,
  TableFooterDef,
  TableNavigationState,
} from '@letar/forms-core/table'

import type {
  CellCoord,
  ResolvedColumn,
  TableColumnDef,
  TableFooterDef,
  TableNavigationState,
} from '@letar/forms-core/table'

/**
 * Props компонента Form.Field.TableEditor
 */
export interface TableEditorFieldProps {
  /** Имя array-поля в форме */
  name: string
  /** Лейбл таблицы */
  label?: string
  /** Определения колонок (если не указаны — авто из schema) */
  columns?: TableColumnDef[]
  /** Текст кнопки добавления */
  addLabel?: string
  /** Включить drag&drop сортировку строк */
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
  /** Размер таблицы (Chakra Table size) */
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

/**
 * Значение контекста TableEditor
 */
export interface TableEditorContextValue {
  /** Разрешённые колонки */
  columns: ResolvedColumn[]
  /** Текущие значения строк */
  rows: Record<string, unknown>[]
  /** Полный путь к array-полю */
  fullPath: string
  /** Можно добавить строку */
  canAdd: boolean
  /** Можно удалить строку */
  canRemove: boolean
  /** Добавить строку */
  addRow: () => void
  /** Удалить строку по индексу */
  removeRow: (index: number) => void
  /** Переместить строку (для DnD) */
  moveRow: (from: number, to: number) => void
  /** Навигация */
  navigation: TableNavigationState
  /** Установить редактируемую ячейку */
  setEditingCell: (cell: CellCoord | null) => void
  /** Установить фокусированную ячейку */
  setFocusedCell: (cell: CellCoord | null) => void
  /** Выбранные строки (indices) */
  selectedRows: Set<number>
  /** Toggle выбора строки */
  toggleRowSelection: (index: number) => void
  /** Выбрать все / снять всё */
  toggleSelectAll: () => void
  /** Disabled */
  disabled: boolean
  /** ReadOnly */
  readOnly: boolean
  /** Размер */
  size: 'sm' | 'md' | 'lg'
}
