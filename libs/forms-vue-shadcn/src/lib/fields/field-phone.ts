import { formatPhoneNumber, PHONE_MASKS, type PhoneCountry, stripPhoneNumber } from '@letar/forms-core/phone'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * FieldPhone (Reka-скин) — форматирование через чистый JS-форматтер `@letar/forms-core/phone`
 * (WebKit-safe), не через `useMaskField`/`MaskController` — тот же выбор, что в React-версии.
 */
export const FieldPhone = defineComponent({
  name: 'FieldPhone',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    country: { type: String as PropType<PhoneCountry>, required: false, default: 'RU' },
    autoUnmask: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      undefined,
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

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const mask = PHONE_MASKS[props.country]
        const rawValue = (field.state.value as string) ?? ''
        const displayValue = formatPhoneNumber(stripPhoneNumber(rawValue), mask)
        const resolvedPlaceholder = placeholder ?? mask.replace(/9/g, '_')

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: rekaUIKit.Input({
            value: displayValue,
            onChange: (rawInput: string) => {
              const digits = stripPhoneNumber(rawInput)
              const formatted = formatPhoneNumber(digits, mask)
              field.handleChange(props.autoUnmask ? stripPhoneNumber(formatted) : formatted)
            },
            onBlur: field.handleBlur,
            type: 'tel',
            placeholder: resolvedPlaceholder,
            'data-field-name': props.name,
          }),
        })
      })
    }
  },
})
