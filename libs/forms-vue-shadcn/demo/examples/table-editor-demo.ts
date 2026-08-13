import { AppForm } from '@letar/forms-vue'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { FieldTableEditor } from '../../src/index'

/**
 * Изолированный пример FieldTableEditor — самодостаточный файл (своя Zod-схема, свой AppForm).
 * Те же данные и колонки, что в React-примере (`table-editor-demo/page.tsx`), для честного
 * сравнения при переключении оси Framework (React ↔ Vue) в form-docs.
 */
const schema = z.object({
  items: z.array(
    z.object({
      product: z.string(),
      qty: z.number(),
      price: z.number(),
    }),
  ),
})

export const TableEditorDemo = defineComponent({
  name: 'TableEditorDemo',
  setup() {
    const submitted = ref<Record<string, unknown> | null>(null)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h(
          AppForm,
          {
            schema,
            initialValue: {
              items: [
                { product: 'Молоко', qty: 2, price: 89 },
                { product: 'Хлеб', qty: 1, price: 45 },
              ],
            },
            onSubmit: (value: Record<string, unknown>) => {
              submitted.value = value
            },
          },
          {
            default: () => [
              h(FieldTableEditor, {
                name: 'items',
                columns: [
                  { name: 'product', label: 'Товар', width: '40%' },
                  { name: 'qty', label: 'Кол-во', width: '20%', align: 'right' },
                  { name: 'price', label: 'Цена', width: '20%', align: 'right' },
                ],
                addLabel: 'Добавить позицию',
              }),
              h(
                'button',
                { type: 'submit', class: 'bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm' },
                'Сохранить',
              ),
            ],
          },
        ),
        submitted.value
          ? h('pre', { class: 'bg-muted mt-4 rounded-md p-3 text-xs' }, JSON.stringify(submitted.value, null, 2))
          : null,
      ])
  },
})
