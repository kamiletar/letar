import { computeAggregate } from '@letar/forms-core/table'
import { defineComponent, h, type PropType } from 'vue'
import type { TableEditorController, TableFooterDef } from '../../core/table-editor-types'

/** Footer таблицы с агрегатными значениями (SUM, AVG, COUNT, MIN, MAX). */
export const TableEditorFooter = defineComponent({
  name: 'TableEditorFooter',
  props: {
    controller: { type: Object as PropType<TableEditorController>, required: true },
    footerDefs: { type: Array as PropType<TableFooterDef[]>, required: true },
    selectable: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    return () => {
      const { controller, footerDefs, selectable } = props

      if (footerDefs.length === 0 || controller.rows.length === 0) {
        return null
      }

      const aggregates = new Map<string, { value: number; def: TableFooterDef }>()
      for (const def of footerDefs) {
        const col = controller.columns.find((c) => c.name === def.column)
        const value = computeAggregate(controller.rows, def.column, def.aggregate, col?.computed)
        aggregates.set(def.column, { value, def })
      }

      return h('tfoot', {}, [
        h('tr', { class: 'letar-field__table-editor-footer-row' }, [
          controller.sortable && !controller.readOnly ? h('td') : null,
          selectable && !controller.readOnly ? h('td') : null,

          ...controller.columns.map((col) => {
            const agg = aggregates.get(col.name)
            return h(
              'td',
              {
                key: col.name,
                class: [
                  col.align === 'right' && 'letar-field__table-editor-cell--right',
                  col.align === 'center' && 'letar-field__table-editor-cell--center',
                ],
              },
              agg
                ? [
                  agg.def.label
                    ? h('span', { class: 'letar-field__table-editor-footer-label' }, agg.def.label)
                    : null,
                  agg.def.format ? agg.def.format(agg.value) : agg.value.toLocaleString(),
                ]
                : [],
            )
          }),

          !controller.readOnly ? h('td') : null,
        ]),
      ])
    }
  },
})
