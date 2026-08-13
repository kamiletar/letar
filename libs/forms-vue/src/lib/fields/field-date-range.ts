import {
  DATE_RANGE_PRESET_LABELS as PRESET_LABELS,
  type DateRangePreset,
  type DateRangeValue,
  getPresetRange,
} from '@letar/forms-core/field-widgets'
import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export type { DateRangePreset, DateRangeValue }

/**
 * Пресеты — ряд кнопок под инпутами, не выпадающее меню (тот же выбор, что у React
 * `field-date-range.tsx`: нет смысла заводить Menu-примитив ради 7 текстовых пунктов).
 */
export const FieldDateRange = defineComponent({
  name: 'FieldDateRange',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    startLabel: { type: String, required: false, default: 'С' },
    endLabel: { type: String, required: false, default: 'По' },
    min: { type: String, required: false, default: undefined },
    max: { type: String, required: false, default: undefined },
    presets: { type: Array as PropType<DateRangePreset[]>, required: false, default: undefined },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'horizontal' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as DateRangeValue | undefined) ?? { start: '', end: '' }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'div',
            { class: `letar-field__date-range letar-field__date-range--${props.orientation}` },
            [
              h('label', { class: 'letar-field__date-range-part' }, [
                h('span', {}, props.startLabel),
                h('input', {
                  type: 'date',
                  class: 'letar-field__control',
                  value: value.start,
                  min: props.min,
                  max: value.end || props.max,
                  onInput: (e: Event) => field.handleChange({ ...value, start: (e.target as HTMLInputElement).value }),
                  onBlur: field.handleBlur,
                  'data-field-name': `${props.name}.start`,
                }),
              ]),
              h('label', { class: 'letar-field__date-range-part' }, [
                h('span', {}, props.endLabel),
                h('input', {
                  type: 'date',
                  class: 'letar-field__control',
                  value: value.end,
                  min: value.start || props.min,
                  max: props.max,
                  onInput: (e: Event) => field.handleChange({ ...value, end: (e.target as HTMLInputElement).value }),
                  onBlur: field.handleBlur,
                  'data-field-name': `${props.name}.end`,
                }),
              ]),
            ],
          ),
          props.presets && props.presets.length > 0
            ? h(
              'div',
              { class: 'letar-field__date-range-presets' },
              props.presets.map((preset) =>
                h('button', {
                  key: preset,
                  type: 'button',
                  class: 'letar-field__date-range-preset',
                  onClick: () => field.handleChange(getPresetRange(preset)),
                }, PRESET_LABELS[preset])
              ),
            )
            : null,
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
