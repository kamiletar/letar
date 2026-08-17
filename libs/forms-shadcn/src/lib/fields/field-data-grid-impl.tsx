'use client'

import { useDeclarativeForm, useFormGroup } from '@letar/forms-react'
import { cn } from '@letar/tailwind-utils'
import { useField } from '@tanstack/react-form'
import {
  type ColumnDef,
  type ColumnFiltersState,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  flexRender,
  type RowSelectionState,
  type SortingState,
  stockFeatures,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { type ReactElement, useMemo, useState } from 'react'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { DataGridColumnDef, DataGridFieldProps } from './field-data-grid-types'

/**
 * Набор фич `@tanstack/react-table` v9. `stockFeatures` (все стоковые фичи, как в v8) —
 * сознательный выбор вместо точечного набора: часть методов, которые в v8 считались «core»,
 * в v9 распределены по фичам не всегда очевидным образом (пример — `row.getVisibleCells()`
 * висит на `columnVisibilityFeature`, не на core). Row model factories регистрируются явно —
 * `stockFeatures` их не включает. `filterFns` (полный реестр, deprecated но рабочий) — колонки
 * не задают `filterFn` явно, полагаются на `'auto'`-резолв по типу значения; в v9 `'auto'`
 * находит только зарегистрированные функции, без реестра фильтр молча ничего не делает.
 */
const fieldDataGridFeatures = tableFeatures({
  ...stockFeatures,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
})

function camelToTitle(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

function inferFieldType(value: unknown): 'number' | 'string' {
  return typeof value === 'number' ? 'number' : 'string'
}

/** Ячейка в режиме инлайн-редактирования. */
function EditableCell({
  value,
  fieldType,
  onSave,
  onCancel,
}: {
  value: unknown
  fieldType: 'number' | 'string'
  onSave: (value: unknown) => void
  onCancel: () => void
}): ReactElement {
  const [localValue, setLocalValue] = useState(String(value ?? ''))

  const commit = () => {
    onSave(fieldType === 'number' ? Number(localValue) || 0 : localValue)
  }

  return (
    <input
      autoFocus
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
        }
        if (e.key === 'Escape') {
          onCancel()
        }
      }}
      type={fieldType === 'number' ? 'number' : 'text'}
      className="border-primary w-full rounded-sm border px-1 py-0.5 text-sm outline-none"
    />
  )
}

/**
 * Form.Field.DataGrid — shadcn-скин. Реализация вынесена из `field-data-grid.tsx`
 * (`lazy()`-обёртка) — `@tanstack/react-table` резолвится только при реальном рендере поля,
 * тот же паттерн, что у `FieldRichText`.
 *
 * Портирован из Chakra-версии. Beta-упрощения: без виртуализации (`@tanstack/react-virtual` —
 * второй тяжёлый peer, не тянем ради первого прохода, `FieldTableEditor` уже прецедент этого
 * решения), без resize/drag-reorder колонок, без auto-резолва колонок из schema (`columns`
 * обязателен явно), фильтр только текстовый (contains).
 */
export function FieldDataGrid({
  name,
  label,
  columns: columnDefs,
  pageSize = 20,
  rowSelection = false,
  onRowSave,
  helperText,
  disabled = false,
}: DataGridFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
  const parentGroup = useFormGroup()
  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arrayField = useField({ form, name: fullPath, mode: 'array' }) as any
  const data = (arrayField.state.value as Record<string, unknown>[] | undefined) ?? []

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({})
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set())

  const tableColumns: ColumnDef<typeof fieldDataGridFeatures, Record<string, unknown>>[] = useMemo(() => {
    const cols: ColumnDef<typeof fieldDataGridFeatures, Record<string, unknown>>[] = []

    if (rowSelection) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <shadcnUIKit.Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={() => table.toggleAllPageRowsSelected()}
          />
        ),
        cell: ({ row }) => (
          <shadcnUIKit.Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={() => row.toggleSelected()}
          />
        ),
        size: 40,
        enableSorting: false,
        enableColumnFilter: false,
      })
    }

    for (const colDef of columnDefs) {
      cols.push({
        id: colDef.name,
        accessorKey: colDef.name,
        header: () => colDef.label ?? camelToTitle(colDef.name),
        cell: ({ row, getValue }) => {
          const rowIndex = row.index
          const value = getValue()
          const isEditing = editingCell?.row === rowIndex && editingCell?.col === colDef.name

          if (isEditing && colDef.editable !== false) {
            return (
              <EditableCell
                value={value}
                fieldType={inferFieldType(value)}
                onSave={(newValue) => {
                  form.setFieldValue(`${fullPath}[${rowIndex}].${colDef.name}`, newValue)
                  setEditingCell(null)
                  setModifiedCells((prev) => new Set(prev).add(`${rowIndex}:${colDef.name}`))
                  onRowSave?.({ ...data[rowIndex], [colDef.name]: newValue }, rowIndex)
                }}
                onCancel={() => setEditingCell(null)}
              />
            )
          }

          const isModified = modifiedCells.has(`${rowIndex}:${colDef.name}`)
          return (
            <span
              onClick={() => {
                if (colDef.editable !== false && !disabled) {
                  setEditingCell({ row: rowIndex, col: colDef.name })
                }
              }}
              className={cn(
                'block rounded-sm px-1 transition-colors',
                colDef.align === 'right' && 'text-right',
                colDef.align === 'center' && 'text-center',
                colDef.editable !== false && !disabled && 'cursor-pointer hover:bg-accent',
                isModified && 'bg-yellow-100 dark:bg-yellow-900/20',
              )}
            >
              {value !== null && value !== undefined ? String(value) : '—'}
            </span>
          )
        },
        size: colDef.width ? Number.parseInt(colDef.width, 10) : undefined,
        enableColumnFilter: !!colDef.filter,
        enableSorting: true,
      })
    }

    return cols
  }, [columnDefs, editingCell, disabled, fullPath, form, data, onRowSave, rowSelection, modifiedCells])

  const table = useTable({
    features: fieldDataGridFeatures,
    data,
    columns: tableColumns,
    state: { sorting, columnFilters, rowSelection: rowSelectionState },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelectionState,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    enableRowSelection: rowSelection,
  })

  const tableRows = table.getRowModel().rows

  return (
    <shadcnUIKit.FieldRoot invalid={false}>
      <shadcnUIKit.FieldLabel label={label} />

      {columnDefs.some((c) => c.filter) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {columnDefs.filter((c) => c.filter).map((colDef: DataGridColumnDef) => {
            const column = table.getColumn(colDef.name)
            if (!column) {
              return null
            }
            return (
              <input
                key={colDef.name}
                placeholder={`Фильтр: ${colDef.label ?? colDef.name}`}
                value={(column.getFilterValue() as string) ?? ''}
                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                className="border-input h-7 max-w-[200px] rounded-md border bg-transparent px-2 text-xs outline-none"
              />
            )
          })}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className={cn(
                      'text-muted-foreground px-2 py-2 text-left font-medium select-none',
                      header.column.getCanSort() && 'cursor-pointer',
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <span className="text-xs">↑</span>}
                      {header.column.getIsSorted() === 'desc' && <span className="text-xs">↓</span>}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableRows.length === 0
              ? (
                <tr>
                  <td colSpan={tableColumns.length} className="text-muted-foreground py-8 text-center">
                    Нет данных
                  </td>
                </tr>
              )
              : tableRows.map((row) => (
                <tr key={row.id} className={cn('border-b last:border-0', row.getIsSelected() && 'bg-accent/50')}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="text-xs disabled:pointer-events-none disabled:opacity-40"
          >
            ← Назад
          </button>
          <button
            type="button"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="text-xs disabled:pointer-events-none disabled:opacity-40"
          >
            Далее →
          </button>
          <button
            type="button"
            onClick={() => {
              const headers = columnDefs.map((c) => c.label ?? c.name).join(',')
              const csvRows = data.map((row) =>
                columnDefs.map((c) => {
                  const str = String(row[c.name] ?? '')
                  return str.includes(',') ? `"${str}"` : str
                }).join(',')
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
            className="text-muted-foreground text-xs hover:underline"
          >
            ↓ CSV
          </button>
        </div>
        <span className="text-muted-foreground text-xs">
          Страница {table.state.pagination.pageIndex + 1} из {table.getPageCount() || 1} ({data.length} записей)
        </span>
      </div>

      {rowSelection && Object.values(rowSelectionState).some(Boolean) && (
        <button
          type="button"
          disabled={disabled}
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
          className="text-destructive mt-2 text-xs hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Удалить выбранные ({Object.values(rowSelectionState).filter(Boolean).length})
        </button>
      )}

      <shadcnUIKit.FieldError hasError={false} errorMessage={undefined} helperText={helperText} />
    </shadcnUIKit.FieldRoot>
  )
}
