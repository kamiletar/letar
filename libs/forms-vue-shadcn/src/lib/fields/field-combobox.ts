import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { computed, defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
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
    const { fieldSchema, label, placeholder: metaPlaceholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const placeholder = metaPlaceholder ?? 'Поиск...'

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

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as string | undefined) || undefined

        return FieldWrapper({
          label,
          required,
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
      })
    }
  },
})
