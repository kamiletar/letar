'use client'

import { Box, Field, Table, Text } from '@chakra-ui/react'
import { type ReactElement, useCallback, useState } from 'react'
import { useFormGroup } from '../../../form-group'
import { useDeclarativeForm } from '../../form-context'
import { SortableItem, SortableWrapper } from '../../form-group/form-group-list-sortable'
import { getZodConstraints } from '../../schema-constraints'
import { TableEditorContext } from './table-editor-context'
import { TableEditorFooter } from './table-footer'
import { TableEditorHeader } from './table-header'
import { TableMobileView } from './table-mobile-view'
import { TableEditorRow } from './table-row'
import { TableEditorToolbar } from './table-toolbar'
import type { CellCoord, TableEditorContextValue, TableEditorFieldProps, TableNavigationState } from './table-types'
import { coerceValue, getDefaultRow, parseTSV } from './table-utils'
import { useTableColumns } from './use-table-columns'
import { useTableNavigation } from './use-table-navigation'

/**
 * Form.Field.TableEditor — инлайн-редактируемая таблица для array-полей.
 *
 * Концептуально это FormGroupList с табличным UI вместо карточного.
 * Каждая ячейка привязана к form.Field → автоматическая per-cell Zod валидация.
 *
 * @example Авто-колонки из schema
 * ```tsx
 * <Form.Field.TableEditor name="items" />
 * ```
 *
 * @example Кастомные колонки с computed
 * ```tsx
 * <Form.Field.TableEditor
 *   name="items"
 *   columns={[
 *     { name: 'product', width: '40%' },
 *     { name: 'qty', width: '15%', align: 'right' },
 *     { name: 'price', width: '15%', align: 'right' },
 *     { name: 'total', computed: (row) => row.qty * row.price, label: 'Итого' },
 *   ]}
 *   addLabel="Добавить товар"
 *   sortable={true}
 *   footer={[{ column: 'total', aggregate: 'sum', label: 'Итого:' }]}
 * />
 * ```
 */
export function FieldTableEditor({
  name,
  label,
  columns: columnDefs,
  addLabel,
  sortable = false,
  selectable = false,
  footer,
  maxRows: maxRowsProp,
  minRows: minRowsProp,
  clipboard = true,
  emptyText = 'Нет данных. Нажмите "Добавить строку"',
  size = 'sm',
  striped = false,
  toolbarActions,
  helperText,
  disabled = false,
  readOnly = false,
}: TableEditorFieldProps): ReactElement {
  const { form, schema } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Полный путь к array-полю
  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  // Резолв колонок из schema и/или пользовательских определений
  const columns = useTableColumns(schema, fullPath, columnDefs)

  // Ограничения из schema (min/max items)
  const constraints = getZodConstraints(schema, fullPath)
  const maxRows = maxRowsProp ?? constraints.array?.maxItems
  const minRows = minRowsProp ?? constraints.array?.minItems

  // Навигация
  const [navigation, setNavigation] = useState<TableNavigationState>({
    editingCell: null,
    focusedCell: null,
  })

  // Выбранные строки
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const setEditingCell = useCallback((cell: CellCoord | null) => {
    setNavigation((prev) => ({ ...prev, editingCell: cell }))
  }, [])

  const setFocusedCell = useCallback((cell: CellCoord | null) => {
    setNavigation((prev) => ({ ...prev, focusedCell: cell }))
  }, [])

  const toggleRowSelection = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Стейт для addRow (будет определён внутри render callback)
  // Хук навигации вызываем здесь, передаём addRow через ref
  const addRowRef = { current: () => {} }
  const rowCountRef = { current: 0 }
  const canAddRef = { current: false }

  const { containerRef, handleKeyDown } = useTableNavigation({
    columns,
    rowCount: rowCountRef.current,
    editingCell: navigation.editingCell,
    setEditingCell,
    addRow: () => addRowRef.current(),
    canAdd: canAddRef.current,
    readOnly,
  })

  return (
    <form.Field name={fullPath} mode="array">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(arrayField: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (arrayField.state.value as Record<string, unknown>[] | undefined) ?? []

        const canAdd = maxRows === undefined || rows.length < maxRows
        const canRemove = minRows === undefined || rows.length > minRows

        // Обновляем refs для навигации
        rowCountRef.current = rows.length
        canAddRef.current = canAdd

        const addRow = () => {
          if (!canAdd) return
          arrayField.pushValue(getDefaultRow(columns))
        }
        addRowRef.current = addRow

        const removeRow = (index: number) => {
          if (!canRemove) return
          arrayField.removeValue(index)
          // Очищаем selection для удалённых индексов
          setSelectedRows((prev) => {
            const next = new Set<number>()
            for (const i of prev) {
              if (i < index) next.add(i)
              else if (i > index) next.add(i - 1)
            }
            return next
          })
        }

        const moveRow = (from: number, to: number) => {
          arrayField.moveValue(from, to)
        }

        const toggleSelectAll = () => {
          if (selectedRows.size === rows.length) {
            setSelectedRows(new Set())
          } else {
            setSelectedRows(new Set(rows.map((_, i) => i)))
          }
        }

        const contextValue: TableEditorContextValue = {
          columns,
          rows,
          fullPath,
          canAdd,
          canRemove,
          addRow,
          removeRow,
          moveRow,
          navigation,
          setEditingCell,
          setFocusedCell,
          selectedRows,
          toggleRowSelection,
          toggleSelectAll,
          disabled,
          readOnly,
          size,
        }

        return (
          <TableEditorContext.Provider value={contextValue}>
            <Field.Root>
              {label && <Field.Label>{label}</Field.Label>}

              {/* Мобильный вид — карточки */}
              <Box display={{ base: 'block', md: 'none' }}>
                <TableMobileView />
              </Box>

              {/* Десктопный вид — таблица */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Box
                ref={containerRef as any}
                display={{ base: 'none', md: 'block' }}
                overflowX="auto"
                borderWidth="1px"
                borderRadius="md"
                onKeyDown={handleKeyDown}
                onPaste={
                  clipboard
                    ? (e) => {
                        // Не перехватываем paste внутри input
                        const target = e.target as HTMLElement
                        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
                        if (disabled || readOnly || !canAdd) return
                        // Парсинг TSV из clipboard (Excel/Sheets)
                        const text = e.clipboardData?.getData('text/plain')
                        if (!text) return
                        const parsed = parseTSV(text)
                        if (parsed.length === 0) return
                        e.preventDefault()
                        const editableCols = columns.filter((col) => !col.computed && !col.readOnly)
                        for (const rawRow of parsed) {
                          if (maxRows !== undefined && rows.length >= maxRows) break
                          const row: Record<string, unknown> = {}
                          for (let i = 0; i < editableCols.length && i < rawRow.length; i++) {
                            row[editableCols[i].name] = coerceValue(rawRow[i], editableCols[i])
                          }
                          arrayField.pushValue(row)
                        }
                      }
                    : undefined
                }
              >
                <Table.Root size={size} striped={striped} interactive variant="outline">
                  <TableEditorHeader selectable={selectable} sortable={sortable} />

                  <Table.Body>
                    {rows.length === 0 ? (
                      <Table.Row>
                        <Table.Cell
                          colSpan={
                            columns.length +
                            (selectable && !readOnly ? 1 : 0) +
                            (sortable && !readOnly ? 1 : 0) +
                            (!readOnly ? 1 : 0)
                          }
                          textAlign="center"
                          py="8"
                        >
                          <Text color="fg.muted">{emptyText}</Text>
                        </Table.Cell>
                      </Table.Row>
                    ) : sortable && !readOnly ? (
                      <SortableWrapper
                        items={rows.map((_, i) => `${fullPath}-${i}`)}
                        onReorder={(oldIdx, newIdx) => moveRow(oldIdx, newIdx)}
                      >
                        {rows.map((rowData, rowIndex) => (
                          <SortableItem key={`${fullPath}-${rowIndex}`} id={`${fullPath}-${rowIndex}`}>
                            <TableEditorRow
                              rowIndex={rowIndex}
                              rowData={rowData}
                              selectable={selectable}
                              sortable={sortable}
                            />
                          </SortableItem>
                        ))}
                      </SortableWrapper>
                    ) : (
                      rows.map((rowData, rowIndex) => (
                        <TableEditorRow
                          key={rowIndex}
                          rowIndex={rowIndex}
                          rowData={rowData}
                          selectable={selectable}
                          sortable={sortable}
                        />
                      ))
                    )}
                  </Table.Body>

                  {footer && footer.length > 0 && (
                    <TableEditorFooter footerDefs={footer} selectable={selectable} sortable={sortable} />
                  )}
                </Table.Root>
              </Box>

              <TableEditorToolbar addLabel={addLabel} actions={toolbarActions} />

              {helperText && <Field.HelperText>{helperText}</Field.HelperText>}
            </Field.Root>
          </TableEditorContext.Provider>
        )
      }}
    </form.Field>
  )
}
