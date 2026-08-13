import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

export interface FieldNativeSelectOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Нативный `<select>` браузера — отдельное поле от `FieldSelect`/`FieldCombobox` для паритета
 * имён с React (`field-native-select.tsx`). `options` — проп сверх контракта `createField`,
 * поле собрано напрямую, как и `FieldSelect`.
 */
export const FieldNativeSelect = defineComponent({
  name: 'FieldNativeSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldNativeSelectOption[]>, required: true },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

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
          children: rekaUIKit.NativeSelect({
            value: field.state.value as string | undefined,
            onChange: (next) => field.handleChange(next),
            onBlur: field.handleBlur,
            options: props.options,
            placeholder,
            'data-field-name': props.name,
          }),
        }))
    }
  },
})
