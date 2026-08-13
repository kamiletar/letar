import { AppForm } from '@letar/forms-vue'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { FieldCombobox } from '../../src/index'

/**
 * Изолированный пример FieldCombobox — самодостаточный файл (своя Zod-схема, свой AppForm).
 */
const schema = z.object({
  tag: z.string().optional().meta({ ui: { title: 'Тег' } }),
})

const TAG_OPTIONS = [
  { value: 'furniture', label: 'Мебель' },
  { value: 'electronics', label: 'Электроника' },
  { value: 'books', label: 'Книги' },
]

export const ComboboxDemo = defineComponent({
  name: 'ComboboxDemo',
  setup() {
    const submitted = ref<Record<string, unknown> | null>(null)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h(
          AppForm,
          {
            schema,
            initialValue: { tag: '' },
            onSubmit: (value: Record<string, unknown>) => {
              submitted.value = value
            },
          },
          {
            default: () => [
              h(FieldCombobox, { name: 'tag', options: TAG_OPTIONS }),
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
