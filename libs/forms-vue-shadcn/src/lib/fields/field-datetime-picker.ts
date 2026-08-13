import { combineDateTime, parseDateTime } from '@letar/forms-core/field-widgets'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * `minDateTime`/`maxDateTime`/`timeStep` — пропсы сверх контракта `createField`. Значение —
 * строка ISO (`YYYY-MM-DDTHH:MM:00`). Два сырых `<input>` (`date`+`time`) в обход `rekaUIKit.Input`.
 */
export const FieldDateTimePicker = defineComponent({
  name: 'FieldDateTimePicker',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    minDateTime: { type: String as PropType<string | undefined>, required: false, default: undefined },
    maxDateTime: { type: String as PropType<string | undefined>, required: false, default: undefined },
    timeStep: { type: Number, required: false, default: 15 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

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

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const minDate = props.minDateTime?.slice(0, 10)
        const maxDate = props.maxDateTime?.slice(0, 10)
        const value = field.state.value as string | undefined
        const { date, time } = parseDateTime(value)

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { class: 'flex items-center gap-2' }, [
            h('input', {
              type: 'date',
              value: date,
              min: minDate,
              max: maxDate,
              onInput: (e: Event) =>
                field.handleChange(combineDateTime((e.target as HTMLInputElement).value, time) || undefined),
              onBlur: field.handleBlur,
              'data-field-name': `${props.name}-date`,
              class: cn(NATIVE_INPUT_CLASS, 'flex-1'),
            }),
            h('input', {
              type: 'time',
              value: time,
              step: props.timeStep * 60,
              onInput: (e: Event) =>
                field.handleChange(combineDateTime(date, (e.target as HTMLInputElement).value) || undefined),
              onBlur: field.handleBlur,
              'data-field-name': `${props.name}-time`,
              class: cn(NATIVE_INPUT_CLASS, 'w-[150px]'),
            }),
          ]),
        })
      })
    }
  },
})
