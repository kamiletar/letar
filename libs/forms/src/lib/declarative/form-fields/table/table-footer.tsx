'use client'

import { Table, Text } from '@chakra-ui/react'
import { useTableEditorContext } from './table-editor-context'
import type { TableFooterDef } from './table-types'
import { computeAggregate } from './table-utils'

interface TableFooterProps {
  /** Определения агрегатов */
  footerDefs: TableFooterDef[]
  /** Показывается ли чекбокс/drag handle */
  selectable?: boolean
  sortable?: boolean
}

/**
 * Footer таблицы с агрегатными значениями (SUM, AVG, COUNT, MIN, MAX).
 */
export function TableEditorFooter({ footerDefs, selectable, sortable }: TableFooterProps) {
  const { columns, rows, readOnly } = useTableEditorContext()

  if (footerDefs.length === 0 || rows.length === 0) return null

  // Собираем маппинг columnName → aggregate result
  const aggregates = new Map<string, { value: number; def: TableFooterDef }>()
  for (const def of footerDefs) {
    // Ищем computed-функцию для вычисляемых колонок
    const col = columns.find((c) => c.name === def.column)
    const value = computeAggregate(rows, def.column, def.aggregate, col?.computed)
    aggregates.set(def.column, { value, def })
  }

  return (
    <Table.Footer>
      <Table.Row fontWeight="bold">
        {/* Пустые ячейки для drag handle и чекбокса */}
        {sortable && !readOnly && <Table.Cell />}
        {selectable && !readOnly && <Table.Cell />}

        {/* Ячейки данных */}
        {columns.map((col) => {
          const agg = aggregates.get(col.name)
          return (
            <Table.Cell key={col.name} textAlign={col.align}>
              {agg ? (
                <Text>
                  {agg.def.label && (
                    <Text as="span" color="fg.muted" mr="1">
                      {agg.def.label}
                    </Text>
                  )}
                  {agg.def.format ? agg.def.format(agg.value) : agg.value.toLocaleString()}
                </Text>
              ) : null}
            </Table.Cell>
          )
        })}

        {/* Пустая ячейка для действий */}
        {!readOnly && <Table.Cell />}
      </Table.Row>
    </Table.Footer>
  )
}
