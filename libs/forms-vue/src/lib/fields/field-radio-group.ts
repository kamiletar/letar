import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export interface FieldRadioGroupOption {
  value: string
  label: string
}

/** Радиогруппа — проп `options`, которого нет в `createField`, собрана напрямую как `FieldSelect`. */
export const FieldRadioGroup = defineComponent({
  name: 'FieldRadioGroup',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    options: { type: Array as PropType<FieldRadioGroupOption[]>, required: true },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'vertical' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(
        form,
        fullPath,
        fieldSchema,
        (field, hasError, errorMessage) =>
          h('div', { class: 'letar-field', 'data-field-name': props.name }, [
            label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
            h(
              'div',
              {
                class: 'letar-field__radio-group',
                'data-orientation': props.orientation,
                role: 'radiogroup',
              },
              props.options.map((option) =>
                h('label', { key: option.value, class: 'letar-field__radio-option' }, [
                  h('input', {
                    type: 'radio',
                    name: props.name,
                    value: option.value,
                    checked: field.state.value === option.value,
                    onChange: () => field.handleChange(option.value),
                    onBlur: field.handleBlur,
                  }),
                  option.label,
                ])
              ),
            ),
            hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
          ]),
      )
  },
})
