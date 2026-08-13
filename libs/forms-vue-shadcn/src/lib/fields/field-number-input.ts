import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { defineComponent, onErrorCaptured, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { NumberInput } from '../uikit/primitives/number-input'
import { rekaUIKit } from '../uikit/uikit-reka'

/** `min`/`max`/`step` — пропсы сверх контракта `createField`, поле собрано напрямую как `FieldSelect`. */
export const FieldNumberInput = defineComponent({
  name: 'FieldNumberInput',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    min: { type: Number, required: false, default: undefined },
    max: { type: Number, required: false, default: undefined },
    step: { type: Number, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

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
          children: NumberInput({
            value: (field.state.value as number | null) ?? null,
            onChange: (value) => field.handleChange(value ?? undefined),
            onBlur: field.handleBlur,
            min: props.min,
            max: props.max,
            step: props.step,
            'data-field-name': props.name,
          }),
        }))
    }
  },
})
