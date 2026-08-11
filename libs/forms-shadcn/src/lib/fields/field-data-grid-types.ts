'use client'

/** Определение колонки `Form.Field.DataGrid` (shadcn-скин). */
export interface DataGridColumnDef {
  /** Имя поля */
  name: string
  /** Заголовок (по умолчанию — camelCase → Title Case от `name`) */
  label?: string
  /** Ширина (px или CSS-значение) */
  width?: string
  /** Редактируемая (по умолчанию true) */
  editable?: boolean
  /** Показать текстовый фильтр над колонкой */
  filter?: boolean
  /** Выравнивание */
  align?: 'left' | 'center' | 'right'
}

/**
 * Props для Form.Field.DataGrid (shadcn-скин).
 *
 * Beta-упрощение относительно Chakra-версии: без виртуализации (`@tanstack/react-virtual` — не
 * тянем второй тяжёлый peer ради первого прохода, `FieldTableEditor` уже прецедент этого
 * решения), без resize/drag-reorder колонок, без auto-резолва колонок из schema (`columns`
 * обязателен явно) — фильтр только текстовый (contains, регистронезависимо), не
 * range/select/date как в Chakra-версии.
 */
export interface DataGridFieldProps {
  /** Имя array-поля в форме */
  name: string
  /** Лейбл таблицы */
  label?: string
  /** Определения колонок */
  columns: DataGridColumnDef[]
  /** Строк на страницу (по умолчанию 20) */
  pageSize?: number
  /** Включить чекбокс-выбор строк */
  rowSelection?: boolean
  /** Колбэк при сохранении строки (после инлайн-редактирования ячейки) */
  onRowSave?: (row: Record<string, unknown>, index: number) => void
  /** Helper text под таблицей */
  helperText?: string
  /** Disabled */
  disabled?: boolean
}
