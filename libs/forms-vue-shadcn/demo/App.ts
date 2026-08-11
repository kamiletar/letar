import { AppForm } from '@letar/forms-vue'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { FieldCheckbox, FieldCombobox, FieldNumber, FieldSelect, FieldString, FieldTextarea } from '../src/index'

const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').meta({ ui: { title: 'Название', placeholder: 'Введите название' } }),
  rating: z.number().min(1).max(10).meta({ ui: { title: 'Рейтинг (1-10)' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен с условиями' } }),
  category: z.string().meta({ ui: { title: 'Категория' } }),
  notes: z.string().optional().meta({ ui: { title: 'Комментарий' } }),
  tag: z.string().optional().meta({ ui: { title: 'Тег' } }),
})

const CATEGORY_OPTIONS = [
  { value: 'furniture', label: 'Мебель' },
  { value: 'electronics', label: 'Электроника' },
  { value: 'books', label: 'Книги' },
]

export const App = defineComponent({
  name: 'App',
  setup() {
    const submitted = ref<Record<string, unknown> | null>(null)

    return () =>
      h('div', { class: 'space-y-6' }, [
        h('h1', { class: 'text-xl font-semibold' }, '@letar/forms-vue-shadcn — demo'),
        h(
          AppForm,
          {
            schema,
            initialValue: { title: '', rating: 5, agree: false, category: '', notes: '', tag: '' },
            onSubmit: (value: Record<string, unknown>) => {
              submitted.value = value
            },
          },
          {
            default: () => [
              h(FieldString, { name: 'title' }),
              h(FieldNumber, { name: 'rating' }),
              h(FieldSelect, { name: 'category', options: CATEGORY_OPTIONS }),
              h(FieldCombobox, { name: 'tag', options: CATEGORY_OPTIONS }),
              h(FieldTextarea, { name: 'notes' }),
              h(FieldCheckbox, { name: 'agree' }),
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
