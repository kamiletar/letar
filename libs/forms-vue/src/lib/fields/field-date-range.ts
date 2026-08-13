import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

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
