import type { TableEditorController } from '@letar/forms-vue/core'
import { defineComponent, h, type PropType, type VNode } from 'vue'

/** Синхронизирует `indeterminate` (нет декларативного HTML-атрибута) с DOM-узлом чекбокса. */
function syncIndeterminate(vnode: VNode, someSelected: boolean) {
  const el = vnode.el as HTMLInputElement | null
  if (el) {
    el.indeterminate = someSelected
  }
}

/** Заголовок таблицы TableEditor (Reka/Tailwind-скин) — колонки + опциональный select-all. */
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

      return h('thead', { class: '[&_tr]:border-b' }, [
        h('tr', {}, [
          controller.sortable && !controller.readOnly ? h('th', { class: 'w-10' }) : null,

          selectable && !controller.readOnly
            ? h('th', { class: 'w-10 p-2 text-center' }, [
              h('input', {
                type: 'checkbox',
                checked: allSelected,
                onVnodeMounted: (vnode: VNode) => syncIndeterminate(vnode, someSelected),
                onVnodeUpdated: (vnode: VNode) => syncIndeterminate(vnode, someSelected),
                onChange: (e: Event) => {
                  e.stopPropagation()
                  controller.toggleSelectAll()
                },
                class: 'size-4 cursor-pointer',
              }),
            ])
            : null,

          ...controller.columns.map((col) =>
            h(
              'th',
              {
                key: col.name,
                style: col.width !== 'auto' ? { width: col.width } : undefined,
                class: 'h-10 p-2 text-left align-middle font-medium text-muted-foreground'
                  + (col.align === 'right' ? ' text-right' : col.align === 'center' ? ' text-center' : ''),
              },
              [col.label, col.required ? h('span', { class: 'ml-0.5 text-destructive' }, '*') : null],
            )
          ),

          !controller.readOnly ? h('th', { class: 'w-10' }) : null,
        ]),
      ])
    }
  },
})
