import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

export const FieldDate = defineComponent({
  name: 'FieldDate',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    min: { type: String, required: false, default: undefined },
    max: { type: String, required: false, default: undefined },
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
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const rawValue = field.state.value
        const value = rawValue instanceof Date ? rawValue.toISOString().split('T')[0] : (rawValue as string) ?? ''

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('input', {
            id: props.name,
            name: props.name,
            class: 'letar-field__control',
            type: 'date',
            placeholder,
            min: props.min,
            max: props.max,
            value,
            onInput: (event: Event) => field.handleChange((event.target as HTMLInputElement).value),
            onBlur: field.handleBlur,
          }),
        )
      })
  },
})
