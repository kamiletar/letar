import type { ColumnDef } from '@tanstack/vue-table'
import { FlexRender } from '@tanstack/vue-table'
import { computed, defineComponent, h, onMounted, type PropType, ref } from 'vue'
import type { DataGridColumnDef, DataGridFieldProps } from '../core/data-grid-types'
import { resolveFieldMeta } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { camelToTitle } from '../core/table-columns'
import {
  type DataGridRow,
  exportDataGridCsv,
  inferDataGridFieldType,
  useDataGridField,
  useDataGridTable,
} from '../core/use-data-grid'

/**
 * ⚠️ Находка про API: у `@tanstack/vue-table` нет функции `flexRender` (в отличие от React,
 * где `flexRender` — обычная функция, вызывающая `React.createElement`). Vue-адаптер вместо
 * этого экспортирует Vue-компонент `FlexRender` (`h(FlexRender, { render, props })`) — рендер
 * через `defineComponent`, а не прямой вызов `createElement`-аналога, потому что у Vue нет
 * низкоуровневого аналога `createElement` для произвольных значений (строка/функция/VNode) вне
 * компонентного дерева.
 */
function flexRender(renderable: unknown, props: unknown) {
  return h(FlexRender, { render: renderable, props })
}

export type { DataGridColumnDef, DataGridFieldProps }

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
        class: 'letar-field__data-grid-cell-input',
      })
  },
})

/**
 * Form.Field.DataGrid (headless) — реализация (загружается лениво, см. `field-data-grid.ts`).
 * Большая таблица на `@tanstack/vue-table`: сортировка, текстовый фильтр по колонке, пагинация,
 * инлайн-редактирование ячейки, row-selection + bulk-delete, CSV-экспорт.
 *
 * Портировано из `libs/forms-shadcn/src/lib/fields/field-data-grid-impl.tsx`. Табличный wiring
 * (`useVueTable`, sorting/filter/pagination/selection state) и обвязка формы
 * (`useField({ mode: 'array' })`) — в `../core/use-data-grid.ts`, переиспользуются Reka-скином
 * дословно; разметка колонок (заголовки/ячейки/чекбоксы) — своя для каждого пакета, тот же
 * принцип разделения, что у `FieldTableEditor`.
 *
 * Beta-упрощения (как в React-версии): без виртуализации, без resize/drag-reorder колонок,
 * `columns` обязателен явно (без auto-резолва из schema), фильтр только текстовый (contains).
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
    // Vue-реактивные коллекции (`ref(new Set())`) поддерживают мутирующие методы (`add`/`delete`)
    // напрямую — в отличие от React, где `setModifiedCells(prev => new Set(prev).add(x))` обязателен
    // из-за иммутабельного state. Клонировать Set на каждое изменение здесь не нужно.
    const modifiedCells = ref<Set<string>>(new Set())

    const tableColumns = computed<ColumnDef<DataGridRow>[]>(() => {
      const cols: ColumnDef<DataGridRow>[] = []

      if (props.rowSelection) {
        cols.push({
          id: 'select',
          header: ({ table }) =>
            h('input', {
              type: 'checkbox',
              checked: table.getIsAllPageRowsSelected(),
              onChange: () => table.toggleAllPageRowsSelected(),
              class: 'letar-field__data-grid-checkbox',
              'aria-label': 'Выбрать все строки',
            }),
          cell: ({ row }) =>
            h('input', {
              type: 'checkbox',
              checked: row.getIsSelected(),
              onChange: () => row.toggleSelected(),
              class: 'letar-field__data-grid-checkbox',
              'aria-label': 'Выбрать строку',
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
                class: [
                  'letar-field__data-grid-cell',
                  colDef.align === 'right' && 'letar-field__data-grid-cell--right',
                  colDef.align === 'center' && 'letar-field__data-grid-cell--center',
                  colDef.editable !== false && !props.disabled && 'letar-field__data-grid-cell--editable',
                  isModified && 'letar-field__data-grid-cell--modified',
                ],
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
      const tableRows = table.getRowModel().rows
      const hasFilters = props.columns.some((c) => c.filter)
      const hasSelection = Object.values(rowSelectionState.value).some(Boolean)

      return h('div', { class: 'letar-field letar-field__data-grid-root', 'data-field-name': props.name }, [
        label ? h('span', { class: 'letar-field__label' }, label) : null,

        hasFilters
          ? h(
            'div',
            { class: 'letar-field__data-grid-filters' },
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
                class: 'letar-field__data-grid-filter-input',
              })
            }),
          )
          : null,

        h('div', { class: 'letar-field__data-grid' }, [
          h('table', { class: 'letar-field__data-grid-table' }, [
            h(
              'thead',
              {},
              table.getHeaderGroups().map((headerGroup: { id: string; headers: unknown[] }) =>
                h(
                  'tr',
                  { key: headerGroup.id },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table header API
                  (headerGroup.headers as any[]).map((header) =>
                    h(
                      'th',
                      {
                        key: header.id,
                        onClick: header.column.getToggleSortingHandler(),
                        style: header.getSize() !== 150 ? { width: `${header.getSize()}px` } : undefined,
                        class: [
                          'letar-field__data-grid-th',
                          header.column.getCanSort() && 'letar-field__data-grid-th--sortable',
                        ],
                      },
                      [
                        flexRender(header.column.columnDef.header, header.getContext()),
                        header.column.getIsSorted() === 'asc' ? h('span', {}, ' ↑') : null,
                        header.column.getIsSorted() === 'desc' ? h('span', {}, ' ↓') : null,
                      ],
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
                      { colspan: tableColumns.value.length, class: 'letar-field__data-grid-empty' },
                      'Нет данных',
                    ),
                  ]),
                ]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table row API
                : (tableRows as any[]).map((row) =>
                  h(
                    'tr',
                    { key: row.id, class: row.getIsSelected() && 'letar-field__data-grid-row--selected' },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table cell API
                    row.getVisibleCells().map((cell: any) =>
                      h(
                        'td',
                        { key: cell.id, class: 'letar-field__data-grid-td' },
                        flexRender(cell.column.columnDef.cell, cell.getContext()),
                      )
                    ),
                  )
                ),
            ),
          ]),
        ]),

        h('div', { class: 'letar-field__data-grid-toolbar' }, [
          h('div', { class: 'letar-field__data-grid-pagination' }, [
            h('button', {
              type: 'button',
              disabled: !table.getCanPreviousPage(),
              onClick: () => table.previousPage(),
              class: 'letar-field__data-grid-page-button',
            }, '← Назад'),
            h('button', {
              type: 'button',
              disabled: !table.getCanNextPage(),
              onClick: () => table.nextPage(),
              class: 'letar-field__data-grid-page-button',
            }, 'Далее →'),
            h('button', {
              type: 'button',
              onClick: () => exportDataGridCsv(rows.value, props.columns, props.name),
              class: 'letar-field__data-grid-export-button',
            }, '↓ CSV'),
          ]),
          h(
            'span',
            { class: 'letar-field__data-grid-page-info' },
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
            class: 'letar-field__data-grid-delete-button',
          }, `Удалить выбранные (${Object.values(rowSelectionState.value).filter(Boolean).length})`)
          : null,

        props.helperText ? h('p', { class: 'letar-field__helper' }, props.helperText) : null,
      ])
    }
  },
})
