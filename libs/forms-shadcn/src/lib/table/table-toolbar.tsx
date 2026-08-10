'use client'

import type { ReactNode } from 'react'
import { useTableEditorContext } from './table-editor-context'

interface TableToolbarProps {
  /** Текст кнопки добавления */
  addLabel?: string
  /** Кастомные действия */
  actions?: ReactNode
}

/** Панель управления таблицей: кнопка добавления + bulk delete + счётчик. */
export function TableEditorToolbar({ addLabel = 'Добавить строку', actions }: TableToolbarProps) {
  const { rows, canAdd, addRow, selectedRows, removeRow, readOnly, disabled } = useTableEditorContext()

  const handleBulkDelete = () => {
    const indices = [...selectedRows].sort((a, b) => b - a)
    for (const idx of indices) {
      removeRow(idx)
    }
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            disabled={!canAdd || disabled}
            className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            + {addLabel}
          </button>
        )}

        {!readOnly && selectedRows.size > 0 && (
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={disabled}
            className="inline-flex h-8 items-center rounded-md px-3 text-sm text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
          >
            Удалить выбранные ({selectedRows.size})
          </button>
        )}

        {actions}
      </div>

      <span className="text-sm text-muted-foreground">
        {rows.length} {rows.length === 1 ? 'строка' : rows.length < 5 ? 'строки' : 'строк'}
      </span>
    </div>
  )
}
