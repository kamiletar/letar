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
