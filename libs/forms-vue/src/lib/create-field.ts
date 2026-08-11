import { getFieldMeta } from '@letar/forms-core/schema'
import { defineComponent, h, type VNode } from 'vue'
import { useAppFormContext } from './form-context'

/** То, что render-функция поля получает на руки — Vue-аналог `FieldRenderProps` из forms-react. */
export interface FieldRenderArgs {
  /** Field API `@tanstack/vue-form` (`field.state.value`, `field.handleChange`, ...) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any
  name: string
  label?: string
  placeholder?: string
  required: boolean
  hasError: boolean
  errorMessage: string
}

export type FieldRenderFn = (args: FieldRenderArgs) => VNode

/**
 * Фабрика поля — Vue-эквивалент `createField` из `@letar/forms-react`. Читает UI-метаданные
 * поля из той же Zod-схемы через `@letar/forms-core/schema` (`getFieldMeta`) — **ноль** нового
 * кода в `forms-core` под это не потребовалось, схема уже framework-agnostic.
 *
 * Валидация — по подсхеме поля (`schema.shape[name]`) как `onChange`-валидатор
 * `@tanstack/vue-form`: библиотека принимает Zod-схему напрямую (Standard Schema).
 */
export function createField(displayName: string, render: FieldRenderFn) {
  return defineComponent({
    name: displayName,
    props: {
      name: { type: String, required: true },
      label: { type: String, required: false, default: undefined },
      placeholder: { type: String, required: false, default: undefined },
    },
    setup(props) {
      const { form, schema } = useAppFormContext()
      const meta = getFieldMeta(schema, props.name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fieldSchema = (schema as any).shape?.[props.name]

      const label = props.label ?? meta.ui?.title
      const placeholder = props.placeholder ?? meta.ui?.placeholder

      return () =>
        h(
          form.Field,
          { name: props.name, validators: fieldSchema ? { onChange: fieldSchema } : undefined },
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            default: ({ field }: { field: any }) => {
              const errors = (field.state.meta.errors ?? []) as unknown[]
              const hasError = errors.length > 0
              const firstError = errors[0] as { message?: string } | string | undefined
              const errorMessage = hasError
                ? typeof firstError === 'string' ? firstError : firstError?.message ?? ''
                : ''

              return render({
                field,
                name: props.name,
                label,
                placeholder,
                required: meta.required,
                hasError,
                errorMessage,
              })
            },
          },
        )
    },
  })
}
