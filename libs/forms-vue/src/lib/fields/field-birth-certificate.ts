import { normalizeBirthCertificate, validateBirthCertificate } from '@letar/forms-core/validators/ru'
import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/**
 * FieldBirthCertificate (headless) — свидетельство о рождении.
 *
 * БЕЗ маски (MASK_ENGINE.md §7.1, критерий §5.3) — римская часть серии переменной длины
 * (1-5 знаков), структурная маска дала бы ложный отказ. Свободный ввод: нормализация гомоглифов
 * (`|||`→`III`, позиционные X/Х) и разделителей — на blur, не на каждый символ (1:1 порт
 * `forms/field-birth-certificate.tsx`).
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

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const rawValue = (field.state.value as string) ?? ''
        const customError = rawValue && !validateBirthCertificate(rawValue)
          ? 'Формат: римская часть-две буквы № шесть цифр (например, II-МЮ № 123456)'
          : undefined
        const showError = hasError || !!customError
        const displayError = customError ?? errorMessage

        return fieldWrapper(
          { name: props.name, label, required, hasError: showError, errorMessage: displayError },
          h('input', {
            id: props.name,
            name: props.name,
            'data-field-name': props.name,
            class: 'letar-field__control',
            type: 'text',
            placeholder: props.placeholder,
            value: rawValue,
            onInput: (event: Event) => field.handleChange((event.target as HTMLInputElement).value),
            onBlur: () => {
              if (rawValue) {
                field.handleChange(normalizeBirthCertificate(rawValue))
              }
              field.handleBlur()
            },
          }),
        )
      })
  },
})
