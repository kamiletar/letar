import {
  type DataGridColumnDef,
  type DataGridFieldProps,
  type DataGridRow,
  exportDataGridCsv,
  inferDataGridFieldType,
  resolveFieldMeta,
  useAppFormContext,
  useDataGridField,
  useDataGridTable,
} from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import type { ColumnDef } from '@tanstack/vue-table'
import { FlexRender } from '@tanstack/vue-table'
import { computed, defineComponent, h, onErrorCaptured, onMounted, type PropType, ref } from 'vue'
import { rekaUIKit } from '../uikit/uikit-reka'

export type { DataGridColumnDef, DataGridFieldProps }

/**
 * ⚠️ У `@tanstack/vue-table` нет функции `flexRender` (в отличие от React) — только Vue-компонент
 * `FlexRender`. См. подробную заметку в headless-версии (`libs/forms-vue/src/lib/fields/field-data-grid-impl.ts`).
 */
function flexRender(renderable: unknown, props: unknown) {
  return h(FlexRender, { render: renderable, props })
}

/** camelCase → «Title Case» — тот же формат заголовка по умолчанию, что и в headless-версии. */
function camelToTitle(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

/** Координата редактируемой ячейки. */
interface EditingCellCoord {
  row: number
  col: string
}

/** Ячейка в режиме инлайн-редактирования — текстовый/числовой `<input>`, commit по blur/Enter. */
const EditableCell = defineComponent({
  name: 'DataGridEditableCell',
  props: {
    value: { type: null, required: true },
    fieldType: { type: String as PropType<'number' | 'string'>, required: true },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const localValue = ref(String(props.value ?? ''))
    const inputRef = ref<HTMLInputElement | null>(null)

    onMounted(() => inputRef.value?.focus())

    const commit = () => {
      emit('save', props.fieldType === 'number' ? Number(localValue.value) || 0 : localValue.value)
    }

    return () =>
      h('input', {
        ref: inputRef,
        value: localValue.value,
        onInput: (e: Event) => {
          localValue.value = (e.target as HTMLInputElement).value
        },
        onBlur: commit,
        onKeydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            commit()
          }
          if (e.key === 'Escape') {
            emit('cancel')
          }
        },
        type: props.fieldType === 'number' ? 'number' : 'text',
        class: 'border-primary w-full rounded-sm border px-1 py-0.5 text-sm outline-none',
      })
  },
})

/**
 * Form.Field.DataGrid (Reka-скин) — реализация (загружается лениво, см. `field-data-grid.ts`).
 * Табличный wiring (`useVueTable`, sorting/filter/pagination/selection) и обвязка формы
 * (`useField({ mode: 'array' })`) переиспользованы из `@letar/forms-vue/core`
 * (`use-data-grid.ts`) — тот же принцип, что у `FieldTableEditor`
 * (`resolveTableColumns`/`useTableNavigation` shared, разметка своя). Здесь — только Tailwind-
 * разметка колонок/чекбоксов/пагинации по образцу `libs/forms-shadcn/src/lib/fields/field-data-grid-impl.tsx`.
 *
 * Beta-упрощения (как в React-версии и headless-версии): без виртуализации, без
 * resize/drag-reorder колонок, `columns` обязателен явно, фильтр только текстовый (contains).
 */
export const FieldDataGrid = defineComponent({
  name: 'FieldDataGrid',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    columns: { type: Array as PropType<DataGridColumnDef[]>, required: true },
    pageSize: { type: Number, required: false, default: 20 },
    rowSelection: { type: Boolean, required: false, default: false },
    onRowSave: {
      type: Function as PropType<(row: DataGridRow, index: number) => void>,
      required: false,
      default: undefined,
    },
    helperText: { type: String, required: false, default: undefined },
    disabled: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { label } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const { rows, removeRows, setCellValue } = useDataGridField({ form, fullPath: props.name })

    const editingCell = ref<EditingCellCoord | null>(null)
    // Vue-реактивные коллекции поддерживают мутирующие методы (`.add`) напрямую — в отличие от
    // React, где иммутабельный state требует `new Set(prev).add(x)` на каждое изменение.
    const modifiedCells = ref<Set<string>>(new Set())

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    const tableColumns = computed<ColumnDef<DataGridRow>[]>(() => {
      const cols: ColumnDef<DataGridRow>[] = []

      if (props.rowSelection) {
        cols.push({
          id: 'select',
          header: ({ table }) =>
            rekaUIKit.Checkbox({
              checked: table.getIsAllPageRowsSelected(),
              onCheckedChange: () => table.toggleAllPageRowsSelected(),
            }),
          cell: ({ row }) =>
            rekaUIKit.Checkbox({
              checked: row.getIsSelected(),
              onCheckedChange: () => row.toggleSelected(),
            }),
          size: 40,
          enableSorting: false,
          enableColumnFilter: false,
        })
      }

      for (const colDef of props.columns) {
        cols.push({
          id: colDef.name,
          accessorKey: colDef.name,
          header: () => colDef.label ?? camelToTitle(colDef.name),
          cell: ({ row, getValue }) => {
            const rowIndex = row.index
            const value = getValue()
            const isEditing = editingCell.value?.row === rowIndex && editingCell.value?.col === colDef.name

            if (isEditing && colDef.editable !== false) {
              return h(EditableCell, {
                value,
                fieldType: inferDataGridFieldType(value),
                onSave: (newValue: unknown) => {
                  setCellValue(rowIndex, colDef.name, newValue)
                  editingCell.value = null
                  modifiedCells.value.add(`${rowIndex}:${colDef.name}`)
                  props.onRowSave?.({ ...rows.value[rowIndex], [colDef.name]: newValue }, rowIndex)
                },
                onCancel: () => {
                  editingCell.value = null
                },
              })
            }

            const isModified = modifiedCells.value.has(`${rowIndex}:${colDef.name}`)
            return h(
              'span',
              {
                onClick: () => {
                  if (colDef.editable !== false && !props.disabled) {
                    editingCell.value = { row: rowIndex, col: colDef.name }
                  }
                },
                class: cn(
                  'block rounded-sm px-1 transition-colors',
                  colDef.align === 'right' && 'text-right',
                  colDef.align === 'center' && 'text-center',
                  colDef.editable !== false && !props.disabled && 'cursor-pointer hover:bg-accent',
                  isModified && 'bg-yellow-100 dark:bg-yellow-900/20',
                ),
              },
              value !== null && value !== undefined ? String(value) : '—',
            )
          },
          size: colDef.width ? Number.parseInt(colDef.width, 10) : undefined,
          enableColumnFilter: !!colDef.filter,
          enableSorting: true,
        })
      }

      return cols
    })

    const { table, rowSelectionState } = useDataGridTable({
      data: rows,
      columns: tableColumns,
      pageSize: props.pageSize,
      enableRowSelection: props.rowSelection,
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      const tableRows = table.getRowModel().rows
      const hasFilters = props.columns.some((c) => c.filter)
      const hasSelection = Object.values(rowSelectionState.value).some(Boolean)

      return rekaUIKit.FieldRoot({
        invalid: false,
        disabled: props.disabled,
        children: [
          rekaUIKit.FieldLabel({ label, required: false }),

          hasFilters
            ? h(
              'div',
              { class: 'mb-2 flex flex-wrap gap-2' },
              props.columns.filter((c) => c.filter).map((colDef) => {
                const column = table.getColumn(colDef.name)
                if (!column) {
                  return null
                }
                return h('input', {
                  key: colDef.name,
                  placeholder: `Фильтр: ${colDef.label ?? colDef.name}`,
                  value: (column.getFilterValue() as string) ?? '',
                  onInput: (e: Event) => {
                    column.setFilterValue((e.target as HTMLInputElement).value || undefined)
                  },
                  class: 'border-input h-7 max-w-[200px] rounded-md border bg-transparent px-2 text-xs outline-none',
                })
              }),
            )
            : null,

          h('div', { class: 'overflow-x-auto rounded-md border', 'data-field-name': props.name }, [
            h('table', { class: 'w-full border-collapse text-sm' }, [
              h(
                'thead',
                {},
                table.getHeaderGroups().map((headerGroup: { id: string; headers: unknown[] }) =>
                  h(
                    'tr',
                    { key: headerGroup.id, class: 'border-b' },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table header API
                    (headerGroup.headers as any[]).map((header) =>
                      h(
                        'th',
                        {
                          key: header.id,
                          onClick: header.column.getToggleSortingHandler(),
                          style: header.getSize() !== 150 ? { width: `${header.getSize()}px` } : undefined,
                          class: cn(
                            'text-muted-foreground px-2 py-2 text-left font-medium select-none',
                            header.column.getCanSort() && 'cursor-pointer',
                          ),
                        },
                        h('span', { class: 'inline-flex items-center gap-1' }, [
                          flexRender(header.column.columnDef.header, header.getContext()),
                          header.column.getIsSorted() === 'asc' ? h('span', { class: 'text-xs' }, '↑') : null,
                          header.column.getIsSorted() === 'desc' ? h('span', { class: 'text-xs' }, '↓') : null,
                        ]),
                      )
                    ),
                  )
                ),
              ),
              h(
                'tbody',
                {},
                tableRows.length === 0
                  ? [
                    h('tr', {}, [
                      h(
                        'td',
                        {
                          colspan: tableColumns.value.length,
                          class: 'text-muted-foreground py-8 text-center',
                        },
                        'Нет данных',
                      ),
                    ]),
                  ]
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table row API
                  : (tableRows as any[]).map((row) =>
                    h(
                      'tr',
                      {
                        key: row.id,
                        class: cn('border-b last:border-0', row.getIsSelected() && 'bg-accent/50'),
                      },
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table cell API
                      row.getVisibleCells().map((cell: any) =>
                        h(
                          'td',
                          { key: cell.id, class: 'px-2 py-1.5' },
                          flexRender(cell.column.columnDef.cell, cell.getContext()),
                        )
                      ),
                    )
                  ),
              ),
            ]),
          ]),

          h('div', { class: 'mt-2 flex items-center justify-between' }, [
            h('div', { class: 'flex items-center gap-2' }, [
              h('button', {
                type: 'button',
                disabled: !table.getCanPreviousPage(),
                onClick: () => table.previousPage(),
                class: 'text-xs disabled:pointer-events-none disabled:opacity-40',
              }, '← Назад'),
              h('button', {
                type: 'button',
                disabled: !table.getCanNextPage(),
                onClick: () => table.nextPage(),
                class: 'text-xs disabled:pointer-events-none disabled:opacity-40',
              }, 'Далее →'),
              h('button', {
                type: 'button',
                onClick: () => exportDataGridCsv(rows.value, props.columns, props.name),
                class: 'text-muted-foreground text-xs hover:underline',
              }, '↓ CSV'),
            ]),
            h(
              'span',
              { class: 'text-muted-foreground text-xs' },
              `Страница ${table.getState().pagination.pageIndex + 1} из ${
                table.getPageCount() || 1
              } (${rows.value.length} записей)`,
            ),
          ]),

          props.rowSelection && hasSelection
            ? h('button', {
              type: 'button',
              disabled: props.disabled,
              onClick: () => {
                const indices = Object.keys(rowSelectionState.value)
                  .filter((k) => rowSelectionState.value[k])
                  .map(Number)
                removeRows(indices)
                rowSelectionState.value = {}
              },
              class: 'text-destructive mt-2 text-xs hover:underline disabled:pointer-events-none disabled:opacity-50',
            }, `Удалить выбранные (${Object.values(rowSelectionState.value).filter(Boolean).length})`)
            : null,

          rekaUIKit.FieldError({ hasError: false, helperText: props.helperText }),
        ] as unknown as ReturnType<typeof h>,
      })
    }
  },
})
