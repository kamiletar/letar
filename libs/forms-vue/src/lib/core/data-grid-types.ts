/** Определение колонки `Form.Field.DataGrid` — общее для обоих Vue-скинов. */
export interface DataGridColumnDef {
  /** Имя поля */
  name: string
  /** Заголовок (по умолчанию — camelCase → Title Case от `name`, см. `camelToTitle`) */
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
 * Props для `Form.Field.DataGrid` — общие для headless (`@letar/forms-vue`) и Reka-скина
 * (`@letar/forms-vue-shadcn`). Портировано из `libs/forms-shadcn/src/lib/fields/field-data-grid-types.ts`.
 *
 * Те же beta-упрощения, что и в React-версии: без виртуализации, без resize/drag-reorder
 * колонок, `columns` обязателен явно (без auto-резолва из Zod-схемы), фильтр только текстовый
 * (contains, регистронезависимо).
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
