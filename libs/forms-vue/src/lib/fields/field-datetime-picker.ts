import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

function parseDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) { return { date: '', time: '' } }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/)
  if (match) { return { date: match[1], time: match[2] || '' } }
  return { date: '', time: '' }
}

function combineDateTime(date: string, time: string): string {
  if (!date) { return '' }
  if (!time) { return date }
  return `${date}T${time}:00`
}

/** Значение — строка ISO (`YYYY-MM-DDTHH:MM:00`). Два нативных инпута (`date`+`time`) рядом. */
export const FieldDateTimePicker = defineComponent({
  name: 'FieldDateTimePicker',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    minDateTime: { type: String, required: false, default: undefined },
    maxDateTime: { type: String, required: false, default: undefined },
    timeStep: { type: Number, required: false, default: 15 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const minDate = props.minDateTime?.slice(0, 10)
        const maxDate = props.maxDateTime?.slice(0, 10)
        const value = field.state.value as string | undefined
        const { date, time } = parseDateTime(value)

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__datetime-picker' }, [
            h('input', {
              type: 'date',
              class: 'letar-field__control',
              value: date,
              min: minDate,
              max: maxDate,
              onInput: (e: Event) =>
                field.handleChange(combineDateTime((e.target as HTMLInputElement).value, time) || undefined),
              onBlur: field.handleBlur,
              'data-field-name': `${props.name}-date`,
            }),
            h('input', {
              type: 'time',
              class: 'letar-field__control',
              value: time,
              step: props.timeStep * 60,
              onInput: (e: Event) =>
                field.handleChange(combineDateTime(date, (e.target as HTMLInputElement).value) || undefined),
              onBlur: field.handleBlur,
              'data-field-name': `${props.name}-time`,
            }),
          ]),
        )
      })
  },
})
