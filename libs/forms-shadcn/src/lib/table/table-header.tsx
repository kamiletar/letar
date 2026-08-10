'use client'

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
    <thead className="[&_tr]:border-b">
      <tr>
        {sortable && !readOnly && <th className="w-10" />}

        {selectable && !readOnly && (
          <th className="w-10 p-2 text-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = someSelected
                }
              }}
              onChange={(e) => {
                e.stopPropagation()
                toggleSelectAll()
              }}
              className="size-4 cursor-pointer"
            />
          </th>
        )}

        {columns.map((col) => (
          <th
            key={col.name}
            style={{ width: col.width !== 'auto' ? col.width : undefined }}
            className="h-10 p-2 text-left align-middle font-medium text-muted-foreground data-[align=right]:text-right data-[align=center]:text-center"
            data-align={col.align}
          >
            {col.label}
            {col.required && <span className="ml-0.5 text-destructive">*</span>}
          </th>
        ))}

        {!readOnly && <th className="w-10" />}
      </tr>
    </thead>
  )
}
