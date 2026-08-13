import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

export const FieldTime = defineComponent({
  name: 'FieldTime',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    min: { type: String, required: false, default: undefined },
    max: { type: String, required: false, default: undefined },
    step: { type: Number, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) =>
        fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('input', {
            id: props.name,
            name: props.name,
            class: 'letar-field__control',
            type: 'time',
            placeholder,
            min: props.min,
            max: props.max,
            step: props.step,
            value: (field.state.value as string) ?? '',
            onInput: (event: Event) => field.handleChange((event.target as HTMLInputElement).value),
            onBlur: field.handleBlur,
          }),
        ))
  },
})
