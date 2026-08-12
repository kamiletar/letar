'use client'

import { getZodConstraints } from '@letar/forms-core/schema'
import type { CellCoord, TableNavigationState } from '@letar/forms-core/table'
import { coerceValue, getDefaultRow, parseTSV } from '@letar/forms-core/table'
import { useDeclarativeForm, useFormGroup } from '@letar/forms-react'
import { cn } from '@letar/tailwind-utils'
import { type ClipboardEvent, type DragEvent, type ReactElement, useCallback, useRef, useState } from 'react'
import { FieldError } from '../uikit/primitives/field-error'
import { FieldLabel } from '../uikit/primitives/field-label'
import { FieldRoot } from '../uikit/primitives/field-root'
import { TableEditorContext } from './table-editor-context'
import type { TableEditorContextValue, TableEditorFieldProps } from './table-editor-types'
import { TableEditorFooter } from './table-footer'
import { TableEditorHeader } from './table-header'
import { TableMobileView } from './table-mobile-view'
import { TableEditorRow } from './table-row'
import { TableEditorToolbar } from './table-toolbar'
import { useTableColumns } from './use-table-columns'
import { useTableNavigation } from './use-table-navigation'

/**
 * Form.Field.TableEditor — shadcn-скин, четвёртое поле из приоритетного списка координатора
 * (Signature ✅ → FileUpload ✅ → Steps ✅ → Table → RichText, тред `forms-phase7-3-shadcn`).
 *
 * Инлайн-редактируемая таблица для array-полей: FormGroupList с табличным UI вместо карточного.
 * Каждая ячейка привязана к `form.Field` → автоматическая per-cell Zod-валидация. Портировано из
 * `@letar/forms` (Chakra-скин) — та же логика (`use-table-columns`, `use-table-navigation`,
 * `@letar/forms-core/table` утилиты), другая разметка (native `<table>` + Tailwind вместо
 * Chakra `Table.Root`).
 *
 * **Beta-упрощение относительно Chakra-версии:** `sortable` работает через нативный HTML5
 * drag&drop (`draggable` + `onDragStart`/`onDragOver`/`onDrop`), а не `@dnd-kit` — тот же принцип,
 * что у `FormSteps` (без `framer-motion`): не тянуть новый peer ради одной фичи в первом проходе.
 * Функционально эквивалентно (перетаскивание строк работает), но без keyboard-DnD и анимации
 * перестроения списка, которые даёт `@dnd-kit/sortable`.
 *
 * @example Авто-колонки из schema
 * ```tsx
 * <FieldTableEditor name="items" />
 * ```
 *
 * @example Кастомные колонки с computed
 * ```tsx
 * <FieldTableEditor
 *   name="items"
 *   columns={[
 *     { name: 'product', width: '40%' },
 *     { name: 'qty', width: '15%', align: 'right' },
 *     { name: 'price', width: '15%', align: 'right' },
 *     { name: 'total', computed: (row) => row.qty * row.price, label: 'Итого' },
 *   ]}
 *   addLabel="Добавить товар"
 *   sortable
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
  emptyText = 'Нет данных. Нажмите «Добавить строку»',
  size = 'sm',
  striped = false,
  toolbarActions,
  helperText,
  disabled = false,
  readOnly = false,
}: TableEditorFieldProps): ReactElement {
  const { form, schema } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  const columns = useTableColumns(schema, fullPath, columnDefs)

  const constraints = getZodConstraints(schema, fullPath)
  const maxRows = maxRowsProp ?? constraints.array?.maxItems
  const minRows = minRowsProp ?? constraints.array?.minItems

  const [navigation, setNavigation] = useState<TableNavigationState>({
    editingCell: null,
    focusedCell: null,
  })

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // native HTML5 DnD — индекс перетаскиваемой строки и строки под курсором
  const dragRowIndexRef = useRef<number | null>(null)
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null)

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

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- заменяется на реальный addRow ниже, до первого рендера
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
        const rows = (arrayField.state.value as Record<string, unknown>[] | undefined) ?? []

        const canAdd = maxRows === undefined || rows.length < maxRows
        const canRemove = minRows === undefined || rows.length > minRows

        rowCountRef.current = rows.length
        canAddRef.current = canAdd

        const addRow = () => {
          if (!canAdd) {
            return
          }
          arrayField.pushValue(getDefaultRow(columns))
        }
        addRowRef.current = addRow

        const removeRow = (index: number) => {
          if (!canRemove) {
            return
          }
          arrayField.removeValue(index)
          setSelectedRows((prev) => {
            const next = new Set<number>()
            for (const i of prev) {
              if (i < index) {
                next.add(i)
              } else if (i > index) {
                next.add(i - 1)
              }
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

        const handlePaste = clipboard
          ? (e: ClipboardEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
              return
            }
            if (disabled || readOnly || !canAdd) {
              return
            }
            const text = e.clipboardData?.getData('text/plain')
            if (!text) {
              return
            }
            const parsed = parseTSV(text)
            if (parsed.length === 0) {
              return
            }
            e.preventDefault()
            const editableCols = columns.filter((col) => !col.computed && !col.readOnly)
            for (const rawRow of parsed) {
              if (maxRows !== undefined && rows.length >= maxRows) {
                break
              }
              const row: Record<string, unknown> = {}
              for (let i = 0; i < editableCols.length && i < rawRow.length; i++) {
                row[editableCols[i].name] = coerceValue(rawRow[i], editableCols[i])
              }
              arrayField.pushValue(row)
            }
          }
          : undefined

        return (
          <TableEditorContext.Provider value={contextValue}>
            <FieldRoot invalid={false} disabled={disabled}>
              <FieldLabel label={label} />

              {/* Мобильный вид — карточки, ниже md */}
              <div className="block md:hidden">
                <TableMobileView />
              </div>

              {/* Десктопный вид — таблица, от md */}
              <div
                ref={containerRef}
                className="hidden overflow-x-auto rounded-md border md:block"
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              >
                <table className={cn('w-full caption-bottom', size === 'sm' ? 'text-xs' : 'text-sm')}>
                  <TableEditorHeader selectable={selectable} sortable={sortable} />

                  <tbody className={cn(striped && '[&_tr:nth-child(even)]:bg-muted/30')}>
                    {rows.length === 0
                      ? (
                        <tr>
                          <td
                            colSpan={columns.length
                              + (selectable && !readOnly ? 1 : 0)
                              + (sortable && !readOnly ? 1 : 0)
                              + (!readOnly ? 1 : 0)}
                            className="py-8 text-center text-muted-foreground"
                          >
                            {emptyText}
                          </td>
                        </tr>
                      )
                      : (
                        rows.map((rowData, rowIndex) => (
                          <TableEditorRow
                            key={rowIndex}
                            rowIndex={rowIndex}
                            rowData={rowData}
                            selectable={selectable}
                            sortable={sortable}
                            isDragOver={dragOverRowIndex === rowIndex}
                            onDragStart={sortable && !readOnly
                              ? () => {
                                dragRowIndexRef.current = rowIndex
                              }
                              : undefined}
                            onDragOver={sortable && !readOnly
                              ? (e: DragEvent) => {
                                e.preventDefault()
                                setDragOverRowIndex(rowIndex)
                              }
                              : undefined}
                            onDrop={sortable && !readOnly
                              ? (e: DragEvent) => {
                                e.preventDefault()
                                const from = dragRowIndexRef.current
                                setDragOverRowIndex(null)
                                dragRowIndexRef.current = null
                                if (from !== null && from !== rowIndex) {
                                  moveRow(from, rowIndex)
                                }
                              }
                              : undefined}
                          />
                        ))
                      )}
                  </tbody>

                  {footer && footer.length > 0 && (
                    <TableEditorFooter footerDefs={footer} selectable={selectable} sortable={sortable} />
                  )}
                </table>
              </div>

              <TableEditorToolbar addLabel={addLabel} actions={toolbarActions} />

              <FieldError hasError={false} helperText={helperText} />
            </FieldRoot>
          </TableEditorContext.Provider>
        )
      }}
    </form.Field>
  )
}
