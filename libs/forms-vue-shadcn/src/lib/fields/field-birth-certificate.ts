import { normalizeBirthCertificate, validateBirthCertificate } from '@letar/forms-core/validators/ru'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * FieldBirthCertificate (Reka-скин) — свидетельство о рождении, БЕЗ маски (MASK_ENGINE.md §7.1,
 * критерий §5.3) — римская часть серии переменной длины. Нормализация — на blur, 1:1 порт
 * `forms/field-birth-certificate.tsx`.
 */
export const FieldBirthCertificate = defineComponent({
  name: 'FieldBirthCertificate',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: 'II-МЮ № 123456' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

    let capturedError: Error | null = null
    onErrorCaptured((error) => {
      capturedError = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (capturedError) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: capturedError.message })
      }

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const rawValue = (field.state.value as string) ?? ''
        const customError = rawValue && !validateBirthCertificate(rawValue)
          ? 'Формат: римская часть-две буквы № шесть цифр (например, II-МЮ № 123456)'
          : undefined
        const showError = hasError || !!customError
        const displayError = customError ?? errorMessage

        return FieldWrapper({
          label,
          required,
          hasError: showError,
          errorMessage: displayError,
          children: h('input', {
            'data-slot': 'input',
            type: 'text',
            placeholder: props.placeholder,
            value: rawValue,
            onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
            onBlur: () => {
              if (rawValue) {
                field.handleChange(normalizeBirthCertificate(rawValue))
              }
              field.handleBlur()
            },
            'data-field-name': props.name,
            class: cn(NATIVE_INPUT_CLASS),
          }),
        })
      })
    }
  },
})
