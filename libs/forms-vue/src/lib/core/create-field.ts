import { type VNode } from 'vue'
import { defineComponent } from 'vue'
import { resolveFieldMeta, withFieldValidation } from './field-wiring'
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
 *
 * Обвязка (`resolveFieldMeta`/`withFieldValidation`) — общая с `createFieldPrimitives`
 * (`@letar/forms-vue-shadcn`, Фаза 9), не копия: оба живут в `./field-wiring`.
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
      const { fieldSchema, label, placeholder, required } = resolveFieldMeta(
        schema,
        props.name,
        props.label,
        props.placeholder,
      )

      return () =>
        withFieldValidation(
          form,
          props.name,
          fieldSchema,
          (field, hasError, errorMessage) =>
            render({ field, name: props.name, label, placeholder, required, hasError, errorMessage }),
        )
    },
  })
}
