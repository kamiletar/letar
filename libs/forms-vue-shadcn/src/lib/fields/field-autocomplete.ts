import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { computed, defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Упрощённая версия `FieldCombobox`, которая всегда принимает произвольный текст (не только
 * значение из списка) — `allowCustomValue` из Chakra-версии всегда включён. Beta: только
 * статичные `suggestions`, без асинхронного поиска. Портирован из
 * `forms-shadcn/field-autocomplete.tsx`.
 */
export const FieldAutocomplete = defineComponent({
  name: 'FieldAutocomplete',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    suggestions: { type: Array as PropType<string[]>, required: false, default: () => [] },
    minChars: { type: Number, required: false, default: 1 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder: metaPlaceholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const placeholder = metaPlaceholder ?? 'Начните вводить...'
    const inputValue = ref('')

    const filteredOptions = computed(() => {
      if (inputValue.value.length < props.minChars) { return [] }
      const needle = inputValue.value.toLowerCase()
      return props.suggestions.filter((s) => s.toLowerCase().includes(needle)).map((s) => ({ label: s, value: s }))
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

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) =>
        FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: rekaUIKit.Combobox({
            inputValue: inputValue.value,
            onInputChange: (value) => {
              inputValue.value = value
              // allowCustomValue — значение поля обновляется на каждый ввод, не только при выборе
              field.handleChange(value)
            },
            onValueChange: (value) => {
              inputValue.value = value ?? ''
              field.handleChange(value ?? '')
            },
            options: filteredOptions.value,
            placeholder,
            disabled: false,
            'data-field-name': props.name,
          }),
        }))
    }
  },
})
