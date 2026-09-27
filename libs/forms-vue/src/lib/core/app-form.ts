import { createDependentsRegistry } from '@letar/forms-core/uikit'
import { useForm } from '@tanstack/vue-form'
import { defineComponent, h, type PropType, reactive } from 'vue'
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
    // Один на форму (не на поле) — регистрируется до `useForm()`, чтобы попасть в замыкание
    // `listeners.onChange` ниже: form-level листенер сообщает реестру о правке поля (§18.3),
    // без него `handleFieldChange` не звонит никто и очистка зависимых полей не работает —
    // тот же приём, что у `TestForm` в `forms-react` (`libs/forms-react/src/lib/testing/test-form.tsx`)
    const dependents = createDependentsRegistry()

    const form = useForm({
      defaultValues: props.initialValue,
      listeners: {
        onChange: ({ fieldApi }) => dependents.handleFieldChange(fieldApi.name, fieldApi.state.value),
      },
      onSubmit: async ({ value }: { value: Record<string, unknown> }) => {
        await props.onSubmit(value)
      },
    })

    // Реактивная карта видимых подписей полей — тоже на форму целиком: нужна любому
    // потомку-`Select`/`Combobox` с `dependsOn` для подсказки «Сначала выберите «Страна»»
    provideAppForm({ form, schema: props.schema, dependents, labels: reactive(new Map()) })

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
