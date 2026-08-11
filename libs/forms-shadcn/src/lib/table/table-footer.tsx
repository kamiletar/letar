'use client'

import type { TableFooterDef } from '@letar/forms-core/table'
import { computeAggregate } from '@letar/forms-core/table'
import { cn } from '@letar/tailwind-utils'
import { useTableEditorContext } from './table-editor-context'

interface TableFooterProps {
  /** Определения агрегатов */
  footerDefs: TableFooterDef[]
  /** Показывается ли чекбокс/drag handle */
  selectable?: boolean
  sortable?: boolean
}

/** Footer таблицы с агрегатными значениями (SUM, AVG, COUNT, MIN, MAX). */
export function TableEditorFooter({ footerDefs, selectable, sortable }: TableFooterProps) {
  const { columns, rows, readOnly } = useTableEditorContext()

  if (footerDefs.length === 0 || rows.length === 0) {
    return null
  }

  const aggregates = new Map<string, { value: number; def: TableFooterDef }>()
  for (const def of footerDefs) {
    const col = columns.find((c) => c.name === def.column)
    const value = computeAggregate(rows, def.column, def.aggregate, col?.computed)
    aggregates.set(def.column, { value, def })
  }

  return (
    <tfoot>
      <tr className="font-bold">
        {sortable && !readOnly && <td className="p-2" />}
        {selectable && !readOnly && <td className="p-2" />}

        {columns.map((col) => {
          const agg = aggregates.get(col.name)
          return (
            <td
              key={col.name}
              className={cn('p-2', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}
            >
              {agg && (
                <>
                  {agg.def.label && <span className="mr-1 text-muted-foreground">{agg.def.label}</span>}
                  {agg.def.format ? agg.def.format(agg.value) : agg.value.toLocaleString()}
                </>
              )}
            </td>
          )
        })}

        {!readOnly && <td className="p-2" />}
      </tr>
    </tfoot>
  )
}
