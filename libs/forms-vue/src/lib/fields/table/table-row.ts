import { defineComponent, h, type PropType } from 'vue'
import type { TableEditorController } from '../../core/table-editor-types'
import { TableCell } from './table-cell'

/**
 * Строка таблицы TableEditor — ячейки + опциональные drag handle/чекбокс/кнопка удаления.
 * Портировано из `libs/forms-shadcn/src/lib/table/table-row.tsx`. Sortable — нативный HTML5 DnD
 * (см. `field-table-editor.ts`), не `@dnd-kit` — то же упрощение, что и в React shadcn-скине.
 */
export const TableEditorRow = defineComponent({
  name: 'TableEditorRow',
  props: {
    controller: { type: Object as PropType<TableEditorController>, required: true },
    rowIndex: { type: Number, required: true },
    rowData: { type: Object as PropType<Record<string, unknown>>, required: true },
    selectable: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    return () => {
      const { controller, rowIndex, rowData, selectable } = props
      const isSelected = controller.selectedRows.has(rowIndex)
      const isDragOver = controller.dragOverRowIndex === rowIndex

      return h(
        'tr',
        {
          class: [
            'letar-field__table-editor-row',
            isSelected && 'letar-field__table-editor-row--selected',
            isDragOver && 'letar-field__table-editor-row--drag-over',
          ],
          'data-row-index': rowIndex,
          draggable: controller.sortable && !controller.readOnly,
          onDragstart: controller.sortable && !controller.readOnly
            ? () => controller.onRowDragStart(rowIndex)
            : undefined,
          onDragover: controller.sortable && !controller.readOnly
            ? (e: DragEvent) => {
              e.preventDefault()
              controller.onRowDragOver(rowIndex)
            }
            : undefined,
          onDrop: controller.sortable && !controller.readOnly
            ? (e: DragEvent) => {
              e.preventDefault()
              controller.onRowDrop(rowIndex)
            }
            : undefined,
        },
        [
          controller.sortable && !controller.readOnly
            ? h(
              'td',
              { class: 'letar-field__table-editor-drag-handle', title: 'Перетащите для сортировки' },
              '⠿',
            )
            : null,

          selectable && !controller.readOnly
            ? h('td', { class: 'letar-field__table-editor-select-cell' }, [
              h('input', {
                type: 'checkbox',
                checked: isSelected,
                onChange: (e: Event) => {
                  e.stopPropagation()
                  controller.toggleRowSelection(rowIndex)
                },
                class: 'letar-field__table-editor-checkbox',
              }),
            ])
            : null,

          ...controller.columns.map((col, colIndex) =>
            h(TableCell, {
              key: col.name,
              controller,
              rowIndex,
              colIndex,
              column: col,
              rowData,
            })
          ),

          !controller.readOnly
            ? h(
              'td',
              { class: 'letar-field__table-editor-remove-cell' },
              [
                h(
                  'button',
                  {
                    type: 'button',
                    'aria-label': 'Удалить строку',
                    onClick: () => controller.removeRow(rowIndex),
                    disabled: !controller.canRemove || controller.disabled,
                    class: 'letar-field__table-editor-remove-button',
                  },
                  '✕',
                ),
              ],
            )
            : null,
        ],
      )
    }
  },
})
