import { AppForm } from '@letar/forms-vue'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { FieldString } from '../../src/index'

/**
 * Изолированный пример FieldString — самодостаточный файл (своя Zod-схема, свой AppForm),
 * читается с диска отдельно от остальных примеров (form-docs, Этап 1 P7).
 */
const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').meta({ ui: { title: 'Название', placeholder: 'Введите название' } }),
})

export const StringDemo = defineComponent({
  name: 'StringDemo',
  setup() {
    const submitted = ref<Record<string, unknown> | null>(null)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h(
          AppForm,
          {
            schema,
            initialValue: { title: '' },
            onSubmit: (value: Record<string, unknown>) => {
              submitted.value = value
            },
          },
          {
            default: () => [
              h(FieldString, { name: 'title' }),
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
