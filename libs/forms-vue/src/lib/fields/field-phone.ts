import { formatPhoneNumber, PHONE_MASKS, type PhoneCountry, stripPhoneNumber } from '@letar/forms-core/phone'
import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/**
 * FieldPhone (headless) — форматирование через чистый JS-форматтер `@letar/forms-core/phone`
 * (WebKit-safe), не через `useMaskField`/`MaskController` — тот же выбор, что в React-версии
 * (`libs/forms-shadcn/src/lib/fields/field-phone.tsx`).
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
    const { fieldSchema, label, placeholder, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const mask = PHONE_MASKS[props.country]
        const rawValue = (field.state.value as string) ?? ''
        const displayValue = formatPhoneNumber(stripPhoneNumber(rawValue), mask)
        const resolvedPlaceholder = placeholder ?? mask.replace(/9/g, '_')

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('input', {
            id: props.name,
            class: 'letar-field__control',
            type: 'tel',
            inputmode: 'tel',
            autocomplete: 'tel',
            placeholder: resolvedPlaceholder,
            value: displayValue,
            onInput: (event: Event) => {
              const digits = stripPhoneNumber((event.target as HTMLInputElement).value)
              const formatted = formatPhoneNumber(digits, mask)
              field.handleChange(props.autoUnmask ? stripPhoneNumber(formatted) : formatted)
            },
            onBlur: field.handleBlur,
            'data-field-name': props.name,
          }),
        )
      })
  },
})
