import { getZodConstraints } from '@letar/forms-core/schema'
import { coerceValue, getDefaultRow, parseTSV } from '@letar/forms-core/table'
import {
  type CellCoord,
  createTableContainerRef,
  resolveFieldMeta,
  resolveTableColumns,
  type TableEditorController,
  type TableEditorFieldProps,
  useAppFormContext,
  useTableNavigation,
} from '@letar/forms-vue/core'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { rekaUIKit } from '../uikit/uikit-reka'
import { TableEditorFooter } from './table/table-footer'
import { TableEditorHeader } from './table/table-header'
import { TableEditorRow } from './table/table-row'
import { TableEditorToolbar } from './table/table-toolbar'

export type { TableColumnDef, TableEditorFieldProps, TableFooterDef } from '@letar/forms-vue/core'

/**
 * FieldTableEditor (Reka/Tailwind-скин) — инлайн-редактируемая таблица для array-полей формы.
 * Портировано из `libs/forms-shadcn/src/lib/table/field-table-editor.tsx`. Резолв колонок из
 * schema (`resolveTableColumns`), навигация клавиатурой (`useTableNavigation`) и общий тип
 * контроллера (`TableEditorController`) переиспользованы из `@letar/forms-vue/core` — та же
 * логика, что у headless-версии (`@letar/forms-vue`, `FieldTableEditor`), не копия. Подкомпоненты
 * (`./table/table-{header,row,footer,toolbar,cell}.ts`) — свои, с Tailwind-разметкой.
 *
 * **Упрощение объёма (как у headless-версии, задокументировано в CHANGELOG.md):** нет
 * отдельного мобильного карточного вида — одна таблица с `overflow-x: auto`. Sortable — нативный
 * HTML5 DnD, не `@dnd-kit` (то же упрощение, что и в React shadcn-скине).
 *
 * @example Кастомные колонки с footer-агрегатом
 * ```ts
 * h(FieldTableEditor, {
 *   name: 'items',
 *   columns: [
 *     { name: 'product', width: '40%' },
 *     { name: 'qty', width: '15%', align: 'right' },
 *   ],
 *   sortable: true,
 *   footer: [{ column: 'qty', aggregate: 'sum', label: 'Итого:' }],
 * })
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
    let dragRowIndex: number | null = null

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

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

            return rekaUIKit.FieldRoot({
              invalid: false,
              disabled: props.disabled,
              children: [
                rekaUIKit.FieldLabel({ label, required }),

                h(
                  'div',
                  {
                    ref: containerRef,
                    class: 'overflow-x-auto rounded-md border',
                    'data-field-name': props.name,
                    onKeydown: handleKeyDown,
                    onPaste: handlePaste,
                  },
                  [
                    h('table', { class: 'w-full caption-bottom text-sm' }, [
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
                                  class: 'py-8 text-center text-muted-foreground',
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

                rekaUIKit.FieldError({ hasError: false, helperText: props.helperText }),
              ] as unknown as ReturnType<typeof h>,
            })
          },
        },
      )
    }
  },
})
