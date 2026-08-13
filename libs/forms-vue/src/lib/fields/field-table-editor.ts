import { getZodConstraints } from '@letar/forms-core/schema'
import type { CellCoord } from '@letar/forms-core/table'
import { coerceValue, getDefaultRow, parseTSV } from '@letar/forms-core/table'
import { defineComponent, h, type PropType, ref } from 'vue'
import { resolveFieldMeta } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { resolveTableColumns } from '../core/table-columns'
import type { TableEditorController, TableEditorFieldProps } from '../core/table-editor-types'
import { createTableContainerRef, useTableNavigation } from '../core/table-navigation'
import { TableEditorFooter } from './table/table-footer'
import { TableEditorHeader } from './table/table-header'
import { TableEditorRow } from './table/table-row'
import { TableEditorToolbar } from './table/table-toolbar'

export type { TableColumnDef, TableEditorFieldProps, TableFooterDef } from '../core/table-editor-types'

/**
 * FieldTableEditor (headless) — инлайн-редактируемая таблица для array-полей формы. Каждая
 * ячейка — отдельный `form.Field` (`@tanstack/vue-form`, `${name}[i].col`), сама таблица —
 * `form.Field` в режиме `mode: "array"` (`arrayField.pushValue/removeValue/moveValue`, тот же
 * API формата `@tanstack/form-core`, что и у React-версии, подтверждено по
 * `node_modules/@tanstack/vue-form` — см. `libs/forms/PLAN.md`, Этап 6 часть 2, находка про
 * `mode: 'array'`).
 *
 * Портировано из `libs/forms-shadcn/src/lib/table/field-table-editor.tsx`. Подкомпоненты —
 * `./table/table-{header,row,footer,toolbar,cell}.ts`, колонки из schema — `./table/table-columns.ts`,
 * клавиатурная навигация — `./table/table-navigation.ts` (framework-free утилиты уже в
 * `@letar/forms-core/table`, порта не потребовалось).
 *
 * **Упрощение объёма относительно Chakra/shadcn-версий (задокументировано в CHANGELOG.md):**
 * нет отдельного мобильного карточного вида (`TableMobileView`) — одна таблица с
 * `overflow-x: auto` на всех размерах экрана. Sortable — нативный HTML5 DnD (то же упрощение,
 * что и в React shadcn-скине, не второй заход).
 *
 * @example Авто-колонки из schema
 * ```ts
 * h(FieldTableEditor, { name: 'items' })
 * ```
 */
export const FieldTableEditor = defineComponent({
  name: 'FieldTableEditor',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    columns: { type: Array as PropType<TableEditorFieldProps['columns']>, required: false, default: undefined },
    addLabel: { type: String, required: false, default: 'Добавить строку' },
    sortable: { type: Boolean, required: false, default: false },
    selectable: { type: Boolean, required: false, default: false },
    footer: { type: Array as PropType<TableEditorFieldProps['footer']>, required: false, default: undefined },
    maxRows: { type: Number, required: false, default: undefined },
    minRows: { type: Number, required: false, default: undefined },
    clipboard: { type: Boolean, required: false, default: true },
    emptyText: { type: String, required: false, default: 'Нет данных. Нажмите «Добавить строку»' },
    helperText: { type: String, required: false, default: undefined },
    disabled: { type: Boolean, required: false, default: false },
    readOnly: { type: Boolean, required: false, default: false },
  },
  setup(props, { slots }) {
    const { form, schema } = useAppFormContext()
    const { label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const containerRef = createTableContainerRef()
    const editingCell = ref<CellCoord | null>(null)
    const focusedCell = ref<CellCoord | null>(null)
    const selectedRows = ref<Set<number>>(new Set())
    const dragOverRowIndex = ref<number | null>(null)
    // Плоская переменная — индекс перетаскиваемой строки нужен только внутри одного жеста DnD,
    // реактивность на неё не нужна (в отличие от `dragOverRowIndex`, который красит строку-цель).
    let dragRowIndex: number | null = null

    return () => {
      const columns = resolveTableColumns(schema, props.name, props.columns)
      const constraints = getZodConstraints(schema, props.name)
      const maxRows = props.maxRows ?? constraints.array?.maxItems
      const minRows = props.minRows ?? constraints.array?.minItems

      return h(
        form.Field,
        { name: props.name, mode: 'array' },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form array-field API
          default: ({ field }: { field: any }) => {
            const rows = (field.state.value as Record<string, unknown>[] | undefined) ?? []
            const canAdd = maxRows === undefined || rows.length < maxRows
            const canRemove = minRows === undefined || rows.length > minRows

            const addRow = () => {
              if (!canAdd) {
                return
              }
              field.pushValue(getDefaultRow(columns))
            }

            const removeRow = (index: number) => {
              if (!canRemove) {
                return
              }
              field.removeValue(index)
              const next = new Set<number>()
              for (const i of selectedRows.value) {
                if (i < index) {
                  next.add(i)
                } else if (i > index) {
                  next.add(i - 1)
                }
              }
              selectedRows.value = next
            }

            const moveRow = (from: number, to: number) => {
              field.moveValue(from, to)
            }

            const controller: TableEditorController = {
              form,
              fullPath: props.name,
              columns,
              rows,
              canAdd,
              canRemove,
              disabled: props.disabled,
              readOnly: props.readOnly,
              addRow,
              removeRow,
              moveRow,
              editingCell: editingCell.value,
              setEditingCell: (cell) => {
                editingCell.value = cell
              },
              setFocusedCell: (cell) => {
                focusedCell.value = cell
              },
              selectedRows: selectedRows.value,
              toggleRowSelection: (index) => {
                if (selectedRows.value.has(index)) {
                  selectedRows.value.delete(index)
                } else {
                  selectedRows.value.add(index)
                }
              },
              toggleSelectAll: () => {
                selectedRows.value = selectedRows.value.size === rows.length
                  ? new Set()
                  : new Set(rows.map((_, i) => i))
              },
              sortable: props.sortable,
              dragOverRowIndex: dragOverRowIndex.value,
              onRowDragStart: (rowIndex) => {
                dragRowIndex = rowIndex
              },
              onRowDragOver: (rowIndex) => {
                dragOverRowIndex.value = rowIndex
              },
              onRowDrop: (rowIndex) => {
                const from = dragRowIndex
                dragOverRowIndex.value = null
                dragRowIndex = null
                if (from !== null && from !== rowIndex) {
                  moveRow(from, rowIndex)
                }
              },
            }

            const { handleKeyDown } = useTableNavigation(containerRef, {
              columns,
              rowCount: rows.length,
              editingCell: editingCell.value,
              setEditingCell: controller.setEditingCell,
              addRow,
              canAdd,
              readOnly: props.readOnly,
            })

            const handlePaste = props.clipboard
              ? (e: ClipboardEvent) => {
                const target = e.target as HTMLElement
                if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
                  return
                }
                if (props.disabled || props.readOnly || !canAdd) {
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
                  field.pushValue(row)
                }
              }
              : undefined

            return h('div', { class: 'letar-field letar-field__table-editor-root', 'data-field-name': props.name }, [
              label
                ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`)
                : null,

              h(
                'div',
                {
                  ref: containerRef,
                  class: 'letar-field__table-editor',
                  onKeydown: handleKeyDown,
                  onPaste: handlePaste,
                },
                [
                  h('table', { class: 'letar-field__table-editor-table' }, [
                    h(TableEditorHeader, { controller, selectable: props.selectable }),

                    h(
                      'tbody',
                      {},
                      rows.length === 0
                        ? [
                          h('tr', {}, [
                            h(
                              'td',
                              {
                                colspan: columns.length
                                  + (props.selectable && !props.readOnly ? 1 : 0)
                                  + (props.sortable && !props.readOnly ? 1 : 0)
                                  + (!props.readOnly ? 1 : 0),
                                class: 'letar-field__table-editor-empty',
                              },
                              props.emptyText,
                            ),
                          ]),
                        ]
                        : rows.map((rowData, rowIndex) =>
                          h(TableEditorRow, {
                            key: rowIndex,
                            controller,
                            rowIndex,
                            rowData,
                            selectable: props.selectable,
                          })
                        ),
                    ),

                    props.footer && props.footer.length > 0
                      ? h(TableEditorFooter, { controller, footerDefs: props.footer, selectable: props.selectable })
                      : null,
                  ]),
                ],
              ),

              h(TableEditorToolbar, { controller, addLabel: props.addLabel }, { actions: slots.actions }),

              props.helperText ? h('p', { class: 'letar-field__helper' }, props.helperText) : null,
            ])
          },
        },
      )
    }
  },
})
