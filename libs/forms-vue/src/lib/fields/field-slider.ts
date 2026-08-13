import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/** Голый `<input type="range">` — без Radix/Reka Slider-примитива (нет UIKit-абстракции в headless-пакете). */
export const FieldSlider = defineComponent({
  name: 'FieldSlider',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    min: { type: Number, required: false, default: 0 },
    max: { type: Number, required: false, default: 100 },
    step: { type: Number, required: false, default: 1 },
    showValue: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as number | undefined) ?? props.min

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__slider' }, [
            h('input', {
              type: 'range',
              class: 'letar-field__control letar-field__slider-input',
              value,
              min: props.min,
              max: props.max,
              step: props.step,
              onInput: (e: Event) => field.handleChange(Number((e.target as HTMLInputElement).value)),
              onChange: field.handleBlur,
              'data-field-name': props.name,
            }),
            props.showValue ? h('span', { class: 'letar-field__slider-value' }, String(value)) : null,
          ]),
        )
      })
  },
})
