'use client'

import { Box, Button, Checkbox, Field, HStack, Input, Table, Text } from '@chakra-ui/react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { type ReactElement, useMemo, useRef, useState } from 'react'
import { useFormGroup } from '../../../form-group'
import { useDeclarativeForm } from '../../form-context'
import { useTableColumns } from './use-table-columns'

/** Определение колонки DataGrid */
export interface DataGridColumnDef {
  /** Имя поля */
  name: string
  /** Заголовок */
  label?: string
  /** Ширина */
  width?: string
  /** Редактируемая */
  editable?: boolean
  /** Тип фильтра */
  filter?: 'text' | 'range' | 'select' | 'date'
  /** Выравнивание */
  align?: 'left' | 'center' | 'right'
}

/** Props для Form.Field.DataGrid */
export interface DataGridFieldProps {
  /** Имя array-поля */
  name: string
  /** Лейбл */
  label?: string
  /** Колонки */
  columns: DataGridColumnDef[]
  /** Строк на страницу */
  pageSize?: number
  /** Включить выбор строк */
  rowSelection?: boolean
  /** Callback при сохранении строки */
  onRowSave?: (row: Record<string, unknown>, index: number) => Promise<void>
  /** Виртуализация для 1000+ строк (отключает пагинацию) */
  virtualized?: boolean
  /** Высота виртуализированного контейнера */
  virtualHeight?: string
  /** Включить resize колонок */
  columnResizing?: boolean
  /** Размер */
  size?: 'sm' | 'md' | 'lg'
  /** Helper text */
  helperText?: string
  /** Disabled */
  disabled?: boolean
}

/**
 * Form.Field.DataGrid — редактируемая таблица данных на TanStack Table.
 *
 * Для работы с большими объёмами данных: пагинация, сортировка, фильтрация, inline editing.
 *
 * @example
 * ```tsx
 * <Form.Field.DataGrid
 *   name="employees"
 *   columns={[
 *     { name: 'name', editable: true, filter: 'text' },
 *     { name: 'salary', editable: true, filter: 'range' },
 *     { name: 'department', editable: true, filter: 'select' },
 *   ]}
 *   pageSize={20}
 *   rowSelection
 * />
 * ```
 */
export function FieldDataGrid({
  name,
  label,
  columns: columnDefs,
  pageSize = 20,
  rowSelection = false,
  onRowSave,
  virtualized = false,
  virtualHeight = '500px',
  columnResizing = false,
  size = 'sm',
  helperText,
  disabled = false,
}: DataGridFieldProps): ReactElement {
  const { form, schema } = useDeclarativeForm()
  const parentGroup = useFormGroup()
  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  // Резолв колонок из schema
  const resolvedCols = useTableColumns(schema, fullPath)

  // Состояние TanStack Table
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [rowSelectionState, setRowSelectionState] = useState<Record<string, boolean>>({})
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  // Трекинг изменённых ячеек для diff highlighting
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set())

  return (
    <form.Field name={fullPath} mode="array">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(arrayField: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (arrayField.state.value as Record<string, unknown>[] | undefined) ?? []

        // Собираем TanStack Table колонки
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableColumns: ColumnDef<Record<string, unknown>, any>[] = useMemo(() => {
          const cols: ColumnDef<Record<string, unknown>>[] = []

          // Чекбокс выбора
          if (rowSelection) {
            cols.push({
              id: 'select',
              header: ({ table }) => (
                <Checkbox.Root
                  checked={
                    table.getIsAllPageRowsSelected()
                      ? true
                      : table.getIsSomePageRowsSelected()
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={() => table.toggleAllPageRowsSelected()}
                  size="sm"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              ),
              cell: ({ row }) => (
                <Checkbox.Root checked={row.getIsSelected()} onCheckedChange={() => row.toggleSelected()} size="sm">
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              ),
              size: 40,
              enableSorting: false,
              enableColumnFilter: false,
            })
          }

          // Колонки данных
          for (const colDef of columnDefs) {
            const resolved = resolvedCols.find((r) => r.name === colDef.name)
            cols.push({
              id: colDef.name,
              accessorKey: colDef.name,
              header: () => colDef.label ?? resolved?.label ?? colDef.name,
              cell: ({ row, getValue }) => {
                const rowIndex = row.index
                const value = getValue()
                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colDef.name

                if (isEditing && colDef.editable !== false) {
                  return (
                    <EditableCell
                      value={value}
                      fieldType={resolved?.fieldType ?? 'string'}
                      onSave={(newValue) => {
                        // Обновляем в форме
                        const fieldPath = `${fullPath}[${rowIndex}].${colDef.name}`
                        form.setFieldValue(fieldPath, newValue)
                        setEditingCell(null)

                        // Diff highlighting — пометить ячейку как изменённую
                        const cellKey = `${rowIndex}:${colDef.name}`
                        setModifiedCells((prev) => new Set(prev).add(cellKey))

                        // Row-level save callback
                        if (onRowSave) {
                          const updatedRow = { ...data[rowIndex], [colDef.name]: newValue }
                          onRowSave(updatedRow, rowIndex)
                        }
                      }}
                      onCancel={() => setEditingCell(null)}
                    />
                  )
                }

                // Diff highlighting — фон для изменённых ячеек
                const cellKey = `${rowIndex}:${colDef.name}`
                const isModified = modifiedCells.has(cellKey)

                return (
                  <Text
                    cursor={colDef.editable !== false && !disabled ? 'pointer' : 'default'}
                    onClick={() => {
                      if (colDef.editable !== false && !disabled) {
                        setEditingCell({ row: rowIndex, col: colDef.name })
                      }
                    }}
                    textAlign={colDef.align}
                    bg={isModified ? 'yellow.100' : undefined}
                    _dark={isModified ? { bg: 'yellow.900/20' } : undefined}
                    _hover={
                      colDef.editable !== false && !disabled
                        ? { bg: isModified ? 'yellow.200' : 'bg.subtle' }
                        : undefined
                    }
                    px={1}
                    borderRadius="sm"
                    transition="background 0.3s"
                  >
                    {value != null ? String(value) : '—'}
                  </Text>
                )
              },
              size: colDef.width ? parseInt(colDef.width) : undefined,
              enableColumnFilter: !!colDef.filter,
              enableSorting: true,
            })
          }

          return cols
        }, [columnDefs, resolvedCols, editingCell, disabled, fullPath, form, data, onRowSave, rowSelection])

        const table = useReactTable({
          data,
          columns: tableColumns,
          state: {
            sorting,
            columnFilters,
            rowSelection: rowSelectionState,
            ...(columnOrder.length > 0 ? { columnOrder } : {}),
          },
          onSortingChange: setSorting,
          onColumnFiltersChange: setColumnFilters,
          onColumnOrderChange: setColumnOrder,
          onRowSelectionChange: setRowSelectionState,
          getCoreRowModel: getCoreRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          // Пагинация отключается при виртуализации
          ...(virtualized ? {} : { getPaginationRowModel: getPaginationRowModel() }),
          initialState: virtualized ? {} : { pagination: { pageSize } },
          enableRowSelection: rowSelection,
          enableColumnResizing: columnResizing,
          columnResizeMode: 'onChange',
        })

        // Виртуализация
        const tableContainerRef = useRef<HTMLDivElement>(null)
        const { rows: tableRows } = table.getRowModel()
        const rowVirtualizer = useVirtualizer({
          count: tableRows.length,
          getScrollElement: () => tableContainerRef.current,
          estimateSize: () => (size === 'sm' ? 36 : size === 'md' ? 44 : 52),
          overscan: 10,
          enabled: virtualized,
        })

        return (
          <Field.Root>
            {label && <Field.Label>{label}</Field.Label>}

            {/* Фильтры */}
            {columnDefs.some((c) => c.filter) && (
              <HStack gap={2} mb={2} flexWrap="wrap">
                {columnDefs
                  .filter((c) => c.filter)
                  .map((colDef) => {
                    const column = table.getColumn(colDef.name)
                    if (!column) return null
                    return (
                      <Input
                        key={colDef.name}
                        size="xs"
                        placeholder={`Фильтр: ${colDef.label ?? colDef.name}`}
                        value={(column.getFilterValue() as string) ?? ''}
                        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                        maxW="200px"
                      />
                    )
                  })}
              </HStack>
            )}

            {/* Таблица */}
            <Box
              ref={virtualized ? tableContainerRef : undefined}
              overflowX="auto"
              overflowY={virtualized ? 'auto' : undefined}
              maxH={virtualized ? virtualHeight : undefined}
              borderWidth="1px"
              borderRadius="md"
            >
              <Table.Root size={size} interactive variant="outline">
                <Table.Header>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Table.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <Table.ColumnHeader
                          key={header.id}
                          cursor={header.column.getCanSort() ? 'pointer' : 'default'}
                          onClick={header.column.getToggleSortingHandler()}
                          userSelect="none"
                          w={columnResizing ? `${header.getSize()}px` : undefined}
                          position="relative"
                          draggable={header.column.id !== 'select'}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', header.column.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            const fromId = e.dataTransfer.getData('text/plain')
                            const toId = header.column.id
                            if (fromId === toId) return
                            const currentOrder =
                              columnOrder.length > 0 ? columnOrder : table.getAllLeafColumns().map((c) => c.id)
                            const fromIdx = currentOrder.indexOf(fromId)
                            const toIdx = currentOrder.indexOf(toId)
                            if (fromIdx === -1 || toIdx === -1) return
                            const next = [...currentOrder]
                            next.splice(fromIdx, 1)
                            next.splice(toIdx, 0, fromId)
                            setColumnOrder(next)
                          }}
                        >
                          <HStack gap={1}>
                            <Text>{flexRender(header.column.columnDef.header, header.getContext())}</Text>
                            {header.column.getIsSorted() === 'asc' && <Text fontSize="xs">↑</Text>}
                            {header.column.getIsSorted() === 'desc' && <Text fontSize="xs">↓</Text>}
                          </HStack>
                          {/* Resize handle */}
                          {columnResizing && (
                            <Box
                              position="absolute"
                              right="0"
                              top="0"
                              bottom="0"
                              w="4px"
                              cursor="col-resize"
                              userSelect="none"
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              bg={header.column.getIsResizing() ? 'blue.500' : 'transparent'}
                              _hover={{ bg: 'blue.300' }}
                            />
                          )}
                        </Table.ColumnHeader>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Header>

                <Table.Body>
                  {tableRows.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={tableColumns.length} textAlign="center" py={8}>
                        <Text color="fg.muted">Нет данных</Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : virtualized ? (
                    <>
                      {/* Spacer для виртуализации */}
                      {rowVirtualizer.getVirtualItems().length > 0 && (
                        <Table.Row style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px` }}>
                          <Table.Cell colSpan={tableColumns.length} p="0" />
                        </Table.Row>
                      )}
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = tableRows[virtualRow.index]
                        return (
                          <Table.Row
                            key={row.id}
                            bg={row.getIsSelected() ? 'blue.50' : undefined}
                            _dark={row.getIsSelected() ? { bg: 'blue.900/20' } : undefined}
                            style={{ height: `${virtualRow.size}px` }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <Table.Cell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </Table.Cell>
                            ))}
                          </Table.Row>
                        )
                      })}
                      {/* Bottom spacer */}
                      <Table.Row
                        style={{
                          height: `${
                            rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0)
                          }px`,
                        }}
                      >
                        <Table.Cell colSpan={tableColumns.length} p="0" />
                      </Table.Row>
                    </>
                  ) : (
                    tableRows.map((row) => (
                      <Table.Row
                        key={row.id}
                        bg={row.getIsSelected() ? 'blue.50' : undefined}
                        _dark={row.getIsSelected() ? { bg: 'blue.900/20' } : undefined}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <Table.Cell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table.Root>
            </Box>

            {/* Пагинация + CSV export */}
            <HStack justify="space-between" py={2}>
              <HStack gap={2}>
                {!virtualized && (
                  <>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      ← Назад
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Далее →
                    </Button>
                  </>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    // Экспорт CSV
                    const headers = columnDefs.map((c) => c.label ?? c.name).join(',')
                    const csvRows = data.map((row) =>
                      columnDefs
                        .map((c) => {
                          const val = row[c.name]
                          const str = String(val ?? '')
                          return str.includes(',') ? `"${str}"` : str
                        })
                        .join(',')
                    )
                    const csv = [headers, ...csvRows].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${name}-export.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  ↓ CSV
                </Button>
              </HStack>
              <Text fontSize="xs" color="fg.muted">
                {virtualized
                  ? `${data.length} записей`
                  : `Страница ${
                      table.getState().pagination.pageIndex + 1
                    } из ${table.getPageCount()} (${data.length} записей)`}
              </Text>
            </HStack>

            {/* Bulk actions */}
            {rowSelection && Object.keys(rowSelectionState).length > 0 && (
              <HStack gap={2}>
                <Button
                  size="xs"
                  colorPalette="red"
                  variant="ghost"
                  onClick={() => {
                    const indices = Object.keys(rowSelectionState)
                      .filter((k) => rowSelectionState[k])
                      .map(Number)
                      .sort((a, b) => b - a)
                    for (const idx of indices) {
                      arrayField.removeValue(idx)
                    }
                    setRowSelectionState({})
                  }}
                  disabled={disabled}
                >
                  Удалить выбранные ({Object.values(rowSelectionState).filter(Boolean).length})
                </Button>
              </HStack>
            )}

            {helperText && <Field.HelperText>{helperText}</Field.HelperText>}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

/** Ячейка в режиме редактирования */
function EditableCell({
  value,
  fieldType,
  onSave,
  onCancel,
}: {
  value: unknown
  fieldType: string
  onSave: (value: unknown) => void
  onCancel: () => void
}) {
  const [localValue, setLocalValue] = useState(String(value ?? ''))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const coerced = fieldType === 'number' ? Number(localValue) || 0 : localValue
      onSave(coerced)
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <Input
      size="xs"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        const coerced = fieldType === 'number' ? Number(localValue) || 0 : localValue
        onSave(coerced)
      }}
      onKeyDown={handleKeyDown}
      type={fieldType === 'number' ? 'number' : 'text'}
      autoFocus
      borderRadius="0"
    />
  )
}
