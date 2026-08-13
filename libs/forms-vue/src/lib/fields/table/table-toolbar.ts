import { defineComponent, h, type PropType } from 'vue'
import type { TableEditorController } from '../../core/table-editor-types'

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

      return h('div', { class: 'letar-field__table-editor-toolbar' }, [
        h('div', { class: 'letar-field__table-editor-toolbar-left' }, [
          !controller.readOnly
            ? h(
              'button',
              {
                type: 'button',
                onClick: controller.addRow,
                disabled: !controller.canAdd || controller.disabled,
                class: 'letar-field__table-editor-add-button',
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
                class: 'letar-field__table-editor-bulk-delete-button',
              },
              `Удалить выбранные (${controller.selectedRows.size})`,
            )
            : null,

          slots.actions?.() ?? null,
        ]),

        h('span', { class: 'letar-field__table-editor-count' }, `${count} ${rowsWord}`),
      ])
    }
  },
})
