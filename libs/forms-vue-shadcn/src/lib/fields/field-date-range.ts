import {
  DATE_RANGE_PRESET_LABELS as PRESET_LABELS,
  type DateRangePreset,
  type DateRangeValue,
  getPresetRange,
} from '@letar/forms-core/field-widgets'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

export type { DateRangePreset, DateRangeValue }

/**
 * `min`/`max`/`presets`/`orientation` — пропсы сверх контракта `createField`, поле собрано
 * напрямую как `FieldSelect`. Рисует сырой `<input>` в обход `rekaUIKit.Input` (`type="date"`
 * не входит в `UIKitInputProps`) — тот же приём, что у документных полей.
 */
export const FieldDateRange = defineComponent({
  name: 'FieldDateRange',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    startLabel: { type: String, required: false, default: 'С' },
    endLabel: { type: String, required: false, default: 'По' },
    min: { type: String as PropType<string | undefined>, required: false, default: undefined },
    max: { type: String as PropType<string | undefined>, required: false, default: undefined },
    presets: { type: Array as PropType<DateRangePreset[]>, required: false, default: undefined },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'horizontal' },
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
        const value = (field.state.value as DateRangeValue | undefined) ?? { start: '', end: '' }

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { class: 'space-y-2' }, [
            h(
              'div',
              { class: cn('flex gap-2', props.orientation === 'horizontal' ? 'flex-row' : 'flex-col') },
              [
                h('div', { class: 'flex-1 space-y-1' }, [
                  h('span', { class: 'text-muted-foreground text-sm' }, props.startLabel),
                  h('input', {
                    type: 'date',
                    value: value.start,
                    min: props.min,
                    max: value.end || props.max,
                    onInput: (e: Event) =>
                      field.handleChange({ ...value, start: (e.target as HTMLInputElement).value }),
                    onBlur: field.handleBlur,
                    'data-field-name': `${props.name}.start`,
                    class: NATIVE_INPUT_CLASS,
                  }),
                ]),
                h('div', { class: 'flex-1 space-y-1' }, [
                  h('span', { class: 'text-muted-foreground text-sm' }, props.endLabel),
                  h('input', {
                    type: 'date',
                    value: value.end,
                    min: value.start || props.min,
                    max: props.max,
                    onInput: (e: Event) => field.handleChange({ ...value, end: (e.target as HTMLInputElement).value }),
                    onBlur: field.handleBlur,
                    'data-field-name': `${props.name}.end`,
                    class: NATIVE_INPUT_CLASS,
                  }),
                ]),
              ],
            ),
            props.presets && props.presets.length > 0
              ? h(
                'div',
                { class: 'flex flex-wrap gap-1' },
                props.presets.map((preset) =>
                  h('button', {
                    key: preset,
                    type: 'button',
                    onClick: () => field.handleChange(getPresetRange(preset)),
                    class: cn(
                      'border-input hover:bg-accent hover:text-accent-foreground rounded-md border px-2 py-1 text-xs',
                    ),
                  }, PRESET_LABELS[preset])
                ),
              )
              : null,
          ]),
        })
      })
    }
  },
})
