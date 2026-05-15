'use client'

import { Table } from '@chakra-ui/react'
import { useTableEditorContext } from './table-editor-context'

/**
 * Заголовок таблицы TableEditor.
 * Отображает названия колонок + опциональный select-all чекбокс.
 */
export function TableEditorHeader({ selectable, sortable }: { selectable?: boolean; sortable?: boolean }) {
  const { columns, rows, selectedRows, toggleSelectAll, readOnly } = useTableEditorContext()

  const allSelected = rows.length > 0 && selectedRows.size === rows.length
  const someSelected = selectedRows.size > 0 && !allSelected

  return (
    <Table.Header>
      <Table.Row>
        {/* Drag handle колонка */}
        {sortable && !readOnly && <Table.ColumnHeader w="40px" />}

        {/* Чекбокс select-all — нативный input */}
        {selectable && !readOnly && (
          <Table.ColumnHeader w="40px" textAlign="center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={(e) => {
                e.stopPropagation()
                toggleSelectAll()
              }}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
          </Table.ColumnHeader>
        )}

        {/* Колонки данных */}
        {columns.map((col) => (
          <Table.ColumnHeader key={col.name} w={col.width} textAlign={col.align}>
            {col.label}
            {col.required && <span style={{ color: 'var(--chakra-colors-red-500)', marginLeft: '2px' }}>*</span>}
          </Table.ColumnHeader>
        ))}

        {/* Колонка действий (удаление) */}
        {!readOnly && <Table.ColumnHeader w="40px" />}
      </Table.Row>
    </Table.Header>
  )
}
