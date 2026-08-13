import { AppForm } from '@letar/forms-vue'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { FieldNumber } from '../../src/index'

/**
 * Изолированный пример FieldNumber — самодостаточный файл (своя Zod-схема, свой AppForm).
 */
const schema = z.object({
  rating: z.number().min(1).max(10).meta({ ui: { title: 'Рейтинг (1-10)' } }),
})

export const NumberDemo = defineComponent({
  name: 'NumberDemo',
  setup() {
    const submitted = ref<Record<string, unknown> | null>(null)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h(
          AppForm,
          {
            schema,
            initialValue: { rating: 5 },
            onSubmit: (value: Record<string, unknown>) => {
              submitted.value = value
            },
          },
          {
            default: () => [
              h(FieldNumber, { name: 'rating' }),
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
