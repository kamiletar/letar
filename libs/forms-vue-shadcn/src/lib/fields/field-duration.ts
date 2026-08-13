import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { NumberInput } from '../uikit/primitives/number-input'
import { rekaUIKit } from '../uikit/uikit-reka'

function minutesToHHMM(minutes: number): { hours: number; mins: number } {
  return { hours: Math.floor(minutes / 60), mins: minutes % 60 }
}

function hhmmToMinutes(hours: number, mins: number): number {
  return hours * 60 + mins
}

/** Значение — число минут. Два формата: `minutes` (один `NumberInput`) и `HH:MM` (по умолчанию, два рядом). */
export const FieldDuration = defineComponent({
  name: 'FieldDuration',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    format: { type: String as PropType<'HH:MM' | 'minutes'>, required: false, default: 'HH:MM' },
    min: { type: Number, required: false, default: 0 },
    max: { type: Number, required: false, default: 1440 },
    step: { type: Number, required: false, default: 15 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as number | undefined) ?? 0
        const { hours, mins } = minutesToHHMM(value)
        const clamp = (next: number) => field.handleChange(Math.max(props.min, Math.min(props.max, next)))

        if (props.format === 'minutes') {
          return FieldWrapper({
            label,
            required,
            hasError,
            errorMessage,
            children: NumberInput({
              value,
              onChange: (v) => {
                if (v !== null) { clamp(v) }
              },
              onBlur: field.handleBlur,
              min: props.min,
              max: props.max,
              step: props.step,
              'data-field-name': props.name,
            }),
          })
        }

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { class: 'flex items-center gap-2' }, [
            h('div', { class: 'w-20' }, [
              NumberInput({
                value: hours,
                onChange: (v) => {
                  if (v !== null) { clamp(hhmmToMinutes(v, mins)) }
                },
                onBlur: field.handleBlur,
                min: 0,
                max: Math.floor(props.max / 60),
                'data-field-name': `${props.name}-hours`,
              }),
            ]),
            h('span', { class: 'font-bold' }, ':'),
            h('div', { class: 'w-20' }, [
              NumberInput({
                value: mins,
                onChange: (v) => {
                  if (v !== null) { clamp(hhmmToMinutes(hours, v)) }
                },
                onBlur: field.handleBlur,
                min: 0,
                max: 59,
                step: props.step,
                'data-field-name': `${props.name}-mins`,
              }),
            ]),
          ]),
        })
      })
    }
  },
})
