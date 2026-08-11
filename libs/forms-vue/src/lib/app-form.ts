import { useForm } from '@tanstack/vue-form'
import { defineComponent, h, type PropType } from 'vue'
import type { ZodType } from 'zod'
import { provideAppForm } from './form-context'

/**
 * Корневой компонент формы — Vue-эквивалент `<Form schema={...} initialValue={...}
 * onSubmit={...}>` из `@letar/forms`. Заводит `@tanstack/vue-form` через `useForm`,
 * прокидывает `form` + `schema` полям через `provide`/`inject`.
 *
 * Обёртки UIKit тут намеренно нет (в отличие от React-скина) — этот пакет доказывает
 * границу `forms-core`, а не поставляет второй дизайн-скин, см. PLAN.md §7.8.
 */
export const AppForm = defineComponent({
  name: 'AppForm',
  props: {
    schema: { type: Object as PropType<ZodType>, required: true },
    initialValue: { type: Object as PropType<Record<string, unknown>>, required: true },
    onSubmit: {
      type: Function as PropType<(value: Record<string, unknown>) => void | Promise<void>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const form = useForm({
      defaultValues: props.initialValue,
      onSubmit: async ({ value }: { value: Record<string, unknown> }) => {
        await props.onSubmit(value)
      },
    })

    provideAppForm({ form, schema: props.schema })

    return () =>
      h(
        'form',
        {
          onSubmit: (event: Event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          },
        },
        slots.default?.(),
      )
  },
})
