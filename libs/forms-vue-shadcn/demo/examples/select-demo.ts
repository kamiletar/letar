import { AppForm } from '@letar/forms-vue'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { FieldSelect } from '../../src/index'

/**
 * Изолированный пример FieldSelect — самодостаточный файл (своя Zod-схема, свой AppForm).
 */
const schema = z.object({
  category: z.string().meta({ ui: { title: 'Категория' } }),
})

const CATEGORY_OPTIONS = [
  { value: 'furniture', label: 'Мебель' },
  { value: 'electronics', label: 'Электроника' },
  { value: 'books', label: 'Книги' },
]

export const SelectDemo = defineComponent({
  name: 'SelectDemo',
  setup() {
    const submitted = ref<Record<string, unknown> | null>(null)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h(
          AppForm,
          {
            schema,
            initialValue: { category: '' },
            onSubmit: (value: Record<string, unknown>) => {
              submitted.value = value
            },
          },
          {
            default: () => [
              h(FieldSelect, { name: 'category', options: CATEGORY_OPTIONS }),
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
