import { AppForm } from '@letar/forms-vue'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { FieldTextarea } from '../../src/index'

/**
 * Изолированный пример FieldTextarea — самодостаточный файл (своя Zod-схема, свой AppForm).
 */
const schema = z.object({
  notes: z.string().optional().meta({ ui: { title: 'Комментарий' } }),
})

export const TextareaDemo = defineComponent({
  name: 'TextareaDemo',
  setup() {
    const submitted = ref<Record<string, unknown> | null>(null)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h(
          AppForm,
          {
            schema,
            initialValue: { notes: '' },
            onSubmit: (value: Record<string, unknown>) => {
              submitted.value = value
            },
          },
          {
            default: () => [
              h(FieldTextarea, { name: 'notes' }),
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
