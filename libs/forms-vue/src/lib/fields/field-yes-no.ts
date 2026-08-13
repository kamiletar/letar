import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

/** Два кликабельных блока для бинарного выбора (значение — `boolean`). */
export const FieldYesNo = defineComponent({
  name: 'FieldYesNo',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    yesLabel: { type: String, required: false, default: 'Да' },
    noLabel: { type: String, required: false, default: 'Нет' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = field.state.value as boolean | undefined
        const select = (val: boolean) => field.handleChange(val)

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h('div', { class: 'letar-field__yes-no' }, [
            h('div', {
              class: 'letar-field__yes-no-option',
              'data-selected': value === true,
              role: 'radio',
              'aria-checked': value === true,
              onClick: () => select(true),
            }, props.yesLabel),
            h('div', {
              class: 'letar-field__yes-no-option',
              'data-selected': value === false,
              role: 'radio',
              'aria-checked': value === false,
              onClick: () => select(false),
            }, props.noLabel),
          ]),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
