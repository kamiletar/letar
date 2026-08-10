'use client'

import { formatCellValue } from '@letar/forms-core/table'
import { X } from 'lucide-react'
import { useTableEditorContext } from './table-editor-context'

/**
 * Мобильный вид TableEditor — карточки вместо таблицы.
 * Отображается ниже брейкпоинта `md` (см. `field-table-editor.tsx`).
 */
export function TableMobileView() {
  const { columns, rows, addRow, removeRow, canAdd, canRemove, readOnly, disabled } = useTableEditorContext()

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0
        ? <p className="py-6 text-center text-muted-foreground">Нет данных</p>
        : (
          rows.map((rowData, rowIndex) => (
            <div key={rowIndex} className="relative rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">#{rowIndex + 1}</span>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label="Удалить"
                    onClick={() => removeRow(rowIndex)}
                    disabled={!canRemove || disabled}
                    className="inline-flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {columns.map((col) => {
                  const value = col.computed ? col.computed(rowData) : rowData[col.name]
                  return (
                    <div key={col.name} className="flex items-center justify-between text-sm">
                      <span className="min-w-20 font-medium text-muted-foreground">{col.label}</span>
                      <span className="text-right">{formatCellValue(value, col) || '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          disabled={!canAdd || disabled}
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          + Добавить
        </button>
      )}
    </div>
  )
}
