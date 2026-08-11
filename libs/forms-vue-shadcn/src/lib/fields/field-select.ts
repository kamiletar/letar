import { getFieldMeta } from '@letar/forms-core/schema'
import { useAppFormContext } from '@letar/forms-vue'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { rekaUIKit } from '../uikit/uikit-reka'

export interface FieldSelectOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * `options` — проп, которого нет в контракте `createField` (`name`/`label`/`placeholder`),
 * поэтому поле, как и в headless `forms-vue`, собрано напрямую по `useAppFormContext`, не через
 * фабрику.
 */
export const FieldSelect = defineComponent({
  name: 'FieldSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
    clearable: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const meta = getFieldMeta(schema, props.name)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-объект без публичного .shape в типах
    const fieldSchema = (schema as any).shape?.[props.name]

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return h(
        form.Field,
        { name: props.name, validators: fieldSchema ? { onChange: fieldSchema } : undefined },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field slot-параметр
          default: ({ field }: { field: any }) => {
            const errors = (field.state.meta.errors ?? []) as unknown[]
            const hasError = errors.length > 0
            const firstError = errors[0] as { message?: string } | string | undefined
            const errorMessage = hasError
              ? typeof firstError === 'string' ? firstError : firstError?.message ?? ''
              : ''
            const label = props.label ?? meta.ui?.title
            const placeholder = props.placeholder ?? meta.ui?.placeholder
            const required = meta.required
            const clearable = props.clearable ?? !required
            const value = (field.state.value as string | undefined) || undefined

            // `Select` рисует свою метку сам (см. `uikit/primitives/select.ts`) — в отличие от
            // остальных полей, здесь не `FieldWrapper` (он бы продублировал `FieldLabel`), а
            // `FieldRoot` напрямую вокруг `Select` + `FieldError`, как и в React-скине.
            return rekaUIKit.FieldRoot({
              invalid: hasError,
              required,
              children: [
                rekaUIKit.Select({
                  value,
                  onValueChange: (next) => field.handleChange(next ?? ''),
                  onBlur: field.handleBlur,
                  options: props.options,
                  label,
                  placeholder,
                  clearable,
                  'data-field-name': props.name,
                }),
                rekaUIKit.FieldError({ hasError, errorMessage }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- children принимает VNode[], контракт типизирован как единичный TNode
              ] as any,
            })
          },
        },
      )
    }
  },
})
