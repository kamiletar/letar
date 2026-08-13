import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/**
 * Headless-версия без `Intl.NumberFormat`-форматирования (нет UIKit-обёртки, которая бы его
 * применила визуально) — числовой инпут с семантикой валюты, `currency`/`step` для будущего
 * форматирования на стороне потребителя.
 */
export const FieldCurrency = defineComponent({
  name: 'FieldCurrency',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    currency: { type: String, required: false, default: 'RUB' },
    min: { type: Number, required: false, default: undefined },
    max: { type: Number, required: false, default: undefined },
    step: { type: Number, required: false, default: 0.01 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) =>
        fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('input', {
            id: props.name,
            name: props.name,
            class: 'letar-field__control',
            type: 'number',
            placeholder,
            min: props.min,
            max: props.max,
            step: props.step,
            'data-currency': props.currency,
            value: (field.state.value as number | undefined) ?? '',
            onInput: (event: Event) => {
              const raw = (event.target as HTMLInputElement).value
              field.handleChange(raw === '' ? undefined : Number(raw))
            },
            onBlur: field.handleBlur,
          }),
        ))
  },
})
