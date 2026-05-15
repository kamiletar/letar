'use client'

import { IconButton, Table } from '@chakra-ui/react'
import { DragHandle } from '../../form-group/form-group-list-sortable'
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
}

/**
 * Строка таблицы TableEditor.
 * Содержит ячейки, чекбокс выбора и кнопку удаления.
 */
export function TableEditorRow({ rowIndex, rowData, selectable, sortable }: TableRowProps) {
  const { columns, removeRow, canRemove, selectedRows, toggleRowSelection, readOnly, disabled } =
    useTableEditorContext()

  const isSelected = selectedRows.has(rowIndex)

  return (
    <Table.Row
      data-row-index={rowIndex}
      bg={isSelected ? 'blue.50' : undefined}
      _dark={isSelected ? { bg: 'blue.900/20' } : undefined}
    >
      {/* Drag handle */}
      {sortable && !readOnly && (
        <Table.Cell w="40px" textAlign="center">
          <DragHandle />
        </Table.Cell>
      )}

      {/* Чекбокс выбора — нативный input чтобы избежать коллизий Chakra Checkbox */}
      {selectable && !readOnly && (
        <Table.Cell w="40px" textAlign="center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              toggleRowSelection(rowIndex)
            }}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
        </Table.Cell>
      )}

      {/* Ячейки данных */}
      {columns.map((col, colIndex) => (
        <TableCell key={col.name} rowIndex={rowIndex} colIndex={colIndex} column={col} rowData={rowData} />
      ))}

      {/* Кнопка удаления */}
      {!readOnly && (
        <Table.Cell w="40px" textAlign="center">
          <IconButton
            aria-label="Удалить строку"
            size="xs"
            variant="ghost"
            colorPalette="red"
            onClick={() => removeRow(rowIndex)}
            disabled={!canRemove || disabled}
          >
            ✕
          </IconButton>
        </Table.Cell>
      )}
    </Table.Row>
  )
}
