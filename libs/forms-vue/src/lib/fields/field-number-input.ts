import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/**
 * Расширенная версия `FieldInput`-для-чисел с `min`/`max`/`step` — этих пропсов нет в
 * контракте `createField` (только `name`/`label`/`placeholder`), поэтому поле, как и
 * `FieldSelect`, собрано напрямую по `resolveFieldMeta`/`withFieldValidation`.
 */
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
            type: 'number',
            placeholder,
            min: props.min,
            max: props.max,
            step: props.step,
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
