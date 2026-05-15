'use client'

import type { ReactNode } from 'react'

/**
 * Определение колонки таблицы (пользовательское API)
 */
export interface TableColumnDef {
  /** Имя поля в объекте строки */
  name: string
  /** Заголовок колонки (по умолчанию из schema .meta({ ui: { title } })) */
  label?: string
  /** Ширина колонки (CSS значение: '40%', '200px', 'auto') */
  width?: string
  /** Выравнивание содержимого */
  align?: 'left' | 'center' | 'right'
  /** Вычисляемая колонка (readonly, не редактируется) */
  computed?: (row: Record<string, unknown>) => unknown
  /** Формат отображения вычисляемого значения */
  format?: (value: unknown) => string
  /** Скрыть колонку */
  hidden?: boolean
  /** Запретить редактирование ячейки */
  readOnly?: boolean
}

/**
 * Тип Zod-поля для определения рендера ячейки
 */
export type CellFieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'unknown'

/**
 * Разрешённая колонка (после мержа с schema info)
 */
export interface ResolvedColumn {
  /** Имя поля */
  name: string
  /** Отображаемый заголовок */
  label: string
  /** CSS ширина */
  width: string
  /** Выравнивание */
  align: 'left' | 'center' | 'right'
  /** Тип поля из Zod schema */
  fieldType: CellFieldType
  /** Колонка вычисляемая */
  computed?: (row: Record<string, unknown>) => unknown
  /** Формат отображения */
  format?: (value: unknown) => string
  /** Readonly */
  readOnly: boolean
  /** Обязательное поле */
  required: boolean
  /** Enum значения (для select в ячейке) */
  enumValues?: string[]
  /** Placeholder */
  placeholder?: string
}

/**
 * Определение агрегата в footer
 */
export interface TableFooterDef {
  /** Имя колонки для агрегации */
  column: string
  /** Тип агрегата */
  aggregate: 'sum' | 'avg' | 'count' | 'min' | 'max'
  /** Лейбл (например "Итого:") */
  label?: string
  /** Формат отображения */
  format?: (value: number) => string
}

/**
 * Координаты ячейки для навигации
 */
export interface CellCoord {
  row: number
  col: number
}

/**
 * Состояние навигации по таблице
 */
export interface TableNavigationState {
  /** Текущая редактируемая ячейка */
  editingCell: CellCoord | null
  /** Фокусированная ячейка */
  focusedCell: CellCoord | null
}

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
