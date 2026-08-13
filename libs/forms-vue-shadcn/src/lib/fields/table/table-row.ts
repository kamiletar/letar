import type { TableEditorController } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { GripVertical, X } from 'lucide-vue-next'
import { defineComponent, h, type PropType } from 'vue'
import { TableCell } from './table-cell'

/**
 * Строка таблицы TableEditor (Reka/Tailwind-скин) — ячейки + опциональные drag handle/чекбокс/
 * кнопка удаления. Портировано из `libs/forms-shadcn/src/lib/table/table-row.tsx`. Sortable —
 * нативный HTML5 DnD (см. `field-table-editor.ts`), тот же выбор, что в React shadcn-скине.
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
          class: cn(
            'border-b transition-colors hover:bg-muted/50',
            isSelected && 'bg-blue-50 dark:bg-blue-950/20',
            isDragOver && 'border-t-2 border-t-primary',
          ),
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
              { class: 'w-10 p-2 text-center text-muted-foreground', title: 'Перетащите для сортировки' },
              [h(GripVertical, { class: 'inline size-4 cursor-grab' })],
            )
            : null,

          selectable && !controller.readOnly
            ? h('td', { class: 'w-10 p-2 text-center' }, [
              h('input', {
                type: 'checkbox',
                checked: isSelected,
                onChange: (e: Event) => {
                  e.stopPropagation()
                  controller.toggleRowSelection(rowIndex)
                },
                class: 'size-4 cursor-pointer',
              }),
            ])
            : null,

          ...controller.columns.map((col, colIndex) =>
            h(TableCell, { key: col.name, controller, rowIndex, colIndex, column: col, rowData })
          ),

          !controller.readOnly
            ? h('td', { class: 'w-10 p-2 text-center' }, [
              h(
                'button',
                {
                  type: 'button',
                  'aria-label': 'Удалить строку',
                  onClick: () => controller.removeRow(rowIndex),
                  disabled: !controller.canRemove || controller.disabled,
                  class:
                    'inline-flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50',
                },
                [h(X, { class: 'size-3.5' })],
              ),
            ])
            : null,
        ],
      )
    }
  },
})
