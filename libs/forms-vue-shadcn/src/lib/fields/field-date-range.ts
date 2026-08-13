import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

export interface DateRangeValue {
  start: string
  end: string
}

export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'

const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  thisWeek: 'Эта неделя',
  lastWeek: 'Прошлая неделя',
  thisMonth: 'Этот месяц',
  lastMonth: 'Прошлый месяц',
  thisYear: 'Этот год',
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: DateRangePreset): DateRangeValue {
  const today = new Date()

  switch (preset) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      return { start: formatDate(yesterday), end: formatDate(yesterday) }
    }
    case 'thisWeek': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay() + 1)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'lastWeek': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay() - 6)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today.getFullYear(), 11, 31)
      return { start: formatDate(start), end: formatDate(end) }
    }
  }
}

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
