import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

export interface FieldNativeSelectOption {
  value: string
  label: string
}

/**
 * Нативный `<select>` браузера — отдельное поле от `FieldSelect` для паритета имён с React
 * (`field-native-select.tsx`), хотя headless-реализация обоих полей идентична: у пруф-пакета
 * нет кастомного listbox-виджета, который в React-скине отличает `Select` от `NativeSelect`.
 */
export const FieldNativeSelect = defineComponent({
  name: 'FieldNativeSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    options: { type: Array as PropType<FieldNativeSelectOption[]>, required: true },
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
          h(
            'select',
            {
              id: props.name,
              name: props.name,
              class: 'letar-field__control',
              value: field.state.value,
              onChange: (event: Event) => field.handleChange((event.target as HTMLSelectElement).value),
              onBlur: field.handleBlur,
            },
            [
              placeholder ? h('option', { value: '', disabled: true }, placeholder) : null,
              ...props.options.map((option) => h('option', { key: option.value, value: option.value }, option.label)),
            ],
          ),
        ))
  },
})
