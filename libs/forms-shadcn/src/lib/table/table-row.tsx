'use client'

import { GripVertical, X } from 'lucide-react'
import type { DragEvent } from 'react'
import { cn } from '@letar/tailwind-utils'
import { TableCell } from './table-cell'
import { useTableEditorContext } from './table-editor-context'

interface TableRowProps {
  /** Индекс строки */
  rowIndex: number
  /** Данные строки */
  rowData: Record<string, unknown>
  /** Показывать чекбокс выбора */
  selectable?: boolean
  /** Показывать drag handle */
  sortable?: boolean
  /** native HTML5 DnD — колбэки строки-дропа (см. table-editor-root) */
  onDragStart?: (e: DragEvent) => void
  onDragOver?: (e: DragEvent) => void
  onDrop?: (e: DragEvent) => void
  isDragOver?: boolean
}

/**
 * Строка таблицы TableEditor.
 * Содержит ячейки, чекбокс выбора и кнопку удаления.
 */
export function TableEditorRow({
  rowIndex,
  rowData,
  selectable,
  sortable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: TableRowProps) {
  const { columns, removeRow, canRemove, selectedRows, toggleRowSelection, readOnly, disabled } =
    useTableEditorContext()

  const isSelected = selectedRows.has(rowIndex)

  return (
    <tr
      data-row-index={rowIndex}
      className={cn(
        'border-b transition-colors hover:bg-muted/50',
        isSelected && 'bg-blue-50 dark:bg-blue-950/20',
        isDragOver && 'border-t-2 border-t-primary',
      )}
      draggable={sortable && !readOnly}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {sortable && !readOnly && (
        <td className="w-10 p-2 text-center text-muted-foreground" title="Перетащите для сортировки">
          <GripVertical className="inline size-4 cursor-grab" />
        </td>
      )}

      {selectable && !readOnly && (
        <td className="w-10 p-2 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              toggleRowSelection(rowIndex)
            }}
            className="size-4 cursor-pointer"
          />
        </td>
      )}

      {columns.map((col, colIndex) => (
        <TableCell key={col.name} rowIndex={rowIndex} colIndex={colIndex} column={col} rowData={rowData} />
      ))}

      {!readOnly && (
        <td className="w-10 p-2 text-center">
          <button
            type="button"
            aria-label="Удалить строку"
            onClick={() => removeRow(rowIndex)}
            disabled={!canRemove || disabled}
            className="inline-flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        </td>
      )}
    </tr>
  )
}
