import type { TableEditorController } from '@letar/forms-vue/core'
import { defineComponent, h, type PropType } from 'vue'

/** Панель управления таблицей: кнопка добавления + bulk delete + счётчик строк. */
export const TableEditorToolbar = defineComponent({
  name: 'TableEditorToolbar',
  props: {
    controller: { type: Object as PropType<TableEditorController>, required: true },
    addLabel: { type: String, required: false, default: 'Добавить строку' },
  },
  setup(props, { slots }) {
    return () => {
      const { controller, addLabel } = props
      const count = controller.rows.length
      const rowsWord = count === 1 ? 'строка' : count < 5 ? 'строки' : 'строк'

      const handleBulkDelete = () => {
        const indices = [...controller.selectedRows].sort((a, b) => b - a)
        for (const idx of indices) {
          controller.removeRow(idx)
        }
      }

      return h('div', { class: 'flex items-center justify-between py-2' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          !controller.readOnly
            ? h(
              'button',
              {
                type: 'button',
                onClick: controller.addRow,
                disabled: !controller.canAdd || controller.disabled,
                class:
                  'inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
              },
              `+ ${addLabel}`,
            )
            : null,

          !controller.readOnly && controller.selectedRows.size > 0
            ? h(
              'button',
              {
                type: 'button',
                onClick: handleBulkDelete,
                disabled: controller.disabled,
                class:
                  'inline-flex h-8 items-center rounded-md px-3 text-sm text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50',
              },
              `Удалить выбранные (${controller.selectedRows.size})`,
            )
            : null,

          slots.actions?.() ?? null,
        ]),

        h('span', { class: 'text-sm text-muted-foreground' }, `${count} ${rowsWord}`),
      ])
    }
  },
})
