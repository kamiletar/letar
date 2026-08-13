import { defineComponent, h, type PropType, type VNode } from 'vue'
import type { TableEditorController } from '../../core/table-editor-types'

/** Синхронизирует `indeterminate` (нет декларативного HTML-атрибута) с DOM-узлом чекбокса. */
function syncIndeterminate(vnode: VNode, someSelected: boolean) {
  const el = vnode.el as HTMLInputElement | null
  if (el) {
    el.indeterminate = someSelected
  }
}

/** Заголовок таблицы TableEditor — названия колонок + опциональный select-all чекбокс. */
export const TableEditorHeader = defineComponent({
  name: 'TableEditorHeader',
  props: {
    controller: { type: Object as PropType<TableEditorController>, required: true },
    selectable: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    return () => {
      const { controller, selectable } = props
      const allSelected = controller.rows.length > 0 && controller.selectedRows.size === controller.rows.length
      const someSelected = controller.selectedRows.size > 0 && !allSelected

      return h('thead', {}, [
        h('tr', {}, [
          controller.sortable && !controller.readOnly ? h('th', { class: 'letar-field__table-editor-th-drag' }) : null,

          selectable && !controller.readOnly
            ? h('th', { class: 'letar-field__table-editor-th-select' }, [
              h('input', {
                type: 'checkbox',
                checked: allSelected,
                onVnodeMounted: (vnode: VNode) => syncIndeterminate(vnode, someSelected),
                onVnodeUpdated: (vnode: VNode) => syncIndeterminate(vnode, someSelected),
                onChange: (e: Event) => {
                  e.stopPropagation()
                  controller.toggleSelectAll()
                },
                class: 'letar-field__table-editor-checkbox',
              }),
            ])
            : null,

          ...controller.columns.map((col) =>
            h(
              'th',
              {
                key: col.name,
                style: col.width !== 'auto' ? { width: col.width } : undefined,
                class: [
                  'letar-field__table-editor-th',
                  col.align === 'right' && 'letar-field__table-editor-th--right',
                  col.align === 'center' && 'letar-field__table-editor-th--center',
                ],
              },
              [col.label, col.required ? h('span', { class: 'letar-field__table-editor-required' }, ' *') : null],
            )
          ),

          !controller.readOnly ? h('th', { class: 'letar-field__table-editor-th-remove' }) : null,
        ]),
      ])
    }
  },
})
