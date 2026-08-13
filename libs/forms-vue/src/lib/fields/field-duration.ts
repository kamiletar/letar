import { hhmmToMinutes, minutesToHHMM } from '@letar/forms-core/field-widgets'
import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/** Значение — число минут. Два формата: `minutes` (один `<input type="number">`) и `HH:MM` (по умолчанию). */
export const FieldDuration = defineComponent({
  name: 'FieldDuration',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    format: { type: String as PropType<'HH:MM' | 'minutes'>, required: false, default: 'HH:MM' },
    min: { type: Number, required: false, default: 0 },
    max: { type: Number, required: false, default: 1440 },
    step: { type: Number, required: false, default: 15 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as number | undefined) ?? 0
        const { hours, mins } = minutesToHHMM(value)
        const clamp = (next: number) => field.handleChange(Math.max(props.min, Math.min(props.max, next)))

        if (props.format === 'minutes') {
          return fieldWrapper(
            { name: props.name, label, required, hasError, errorMessage },
            h('input', {
              type: 'number',
              class: 'letar-field__control',
              value,
              min: props.min,
              max: props.max,
              step: props.step,
              onInput: (e: Event) => clamp(Number((e.target as HTMLInputElement).value)),
              onBlur: field.handleBlur,
              'data-field-name': props.name,
            }),
          )
        }

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__duration' }, [
            h('input', {
              type: 'number',
              class: 'letar-field__control letar-field__duration-hours',
              value: hours,
              min: 0,
              max: Math.floor(props.max / 60),
              onInput: (e: Event) => clamp(hhmmToMinutes(Number((e.target as HTMLInputElement).value), mins)),
              onBlur: field.handleBlur,
              'data-field-name': `${props.name}-hours`,
            }),
            h('span', {}, ':'),
            h('input', {
              type: 'number',
              class: 'letar-field__control letar-field__duration-mins',
              value: mins,
              min: 0,
              max: 59,
              step: props.step,
              onInput: (e: Event) => clamp(hhmmToMinutes(hours, Number((e.target as HTMLInputElement).value))),
              onBlur: field.handleBlur,
              'data-field-name': `${props.name}-mins`,
            }),
          ]),
        )
      })
  },
})
