import { getFieldMeta } from '@letar/forms-core/schema'
import { useAppFormContext } from '@letar/forms-vue'
import { computed, defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'
import type { FieldSelectOption } from './field-select'

/**
 * `options` — тот же случай, что и `FieldSelect`: проп сверх контракта `createField`, поле
 * собрано напрямую по `useAppFormContext`. Фильтрация по подстроке — обязанность поля, не
 * примитива (`rekaUIKit.Combobox` ничего не фильтрует сам, см. `uikit/primitives/combobox.ts`).
 */
export const FieldCombobox = defineComponent({
  name: 'FieldCombobox',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const meta = getFieldMeta(schema, props.name)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-объект без публичного .shape в типах
    const fieldSchema = (schema as any).shape?.[props.name]

    const inputValue = ref('')
    const filteredOptions = computed(() => {
      const needle = inputValue.value.toLowerCase()
      if (!needle) { return props.options }
      return props.options.filter((opt) => opt.label.toLowerCase().includes(needle))
    })

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
            const placeholder = props.placeholder ?? meta.ui?.placeholder ?? 'Поиск...'
            const value = (field.state.value as string | undefined) || undefined

            return FieldWrapper({
              label,
              required: meta.required,
              hasError,
              errorMessage,
              children: rekaUIKit.Combobox({
                value,
                inputValue: inputValue.value,
                onInputChange: (next) => {
                  inputValue.value = next
                },
                onValueChange: (next) => field.handleChange(next ?? ''),
                options: filteredOptions.value,
                placeholder,
                'data-field-name': props.name,
              }),
            })
          },
        },
      )
    }
  },
})
