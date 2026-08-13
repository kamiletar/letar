import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export interface ScheduleDaySchedule {
  open: string
  close: string
}

export interface WeeklySchedule {
  monday: ScheduleDaySchedule | null
  tuesday: ScheduleDaySchedule | null
  wednesday: ScheduleDaySchedule | null
  thursday: ScheduleDaySchedule | null
  friday: ScheduleDaySchedule | null
  saturday: ScheduleDaySchedule | null
  sunday: ScheduleDaySchedule | null
}

export type DayOfWeek = keyof WeeklySchedule

const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_DAY_NAMES: Record<DayOfWeek, string> = {
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота',
  sunday: 'Воскресенье',
}

const DEFAULT_WORKING_HOURS: WeeklySchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}

function isValidTimeRange(open: string, close: string): boolean {
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  return closeH * 60 + closeM > openH * 60 + openM
}

/**
 * Редактор недельного расписания — toggle дня, время open/close, копирование понедельника на
 * будни, проверка `close > open` с предупреждением. Портирован из
 * `forms-shadcn/field-schedule.tsx` (логика 1:1, вёрстка — голая, `<input type="checkbox"
 * role="switch">` вместо Radix `Switch`, тот же приём, что у headless `FieldSwitch`).
 */
export const FieldSchedule = defineComponent({
  name: 'FieldSchedule',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    dayNames: { type: Object as PropType<Partial<Record<DayOfWeek, string>>>, required: false, default: () => ({}) },
    defaultSchedule: {
      type: Object as PropType<WeeklySchedule>,
      required: false,
      default: () => DEFAULT_WORKING_HOURS,
    },
    days: { type: Array as PropType<DayOfWeek[]>, required: false, default: () => DAYS_OF_WEEK },
    showCopyToWeekdays: { type: Boolean, required: false, default: true },
    offLabel: { type: String, required: false, default: 'Выходной' },
    copyToWeekdaysLabel: { type: String, required: false, default: 'Скопировать Пн на будни' },
    defaultOpenTime: { type: String, required: false, default: '09:00' },
    defaultCloseTime: { type: String, required: false, default: '18:00' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const mergedDayNames = { ...DEFAULT_DAY_NAMES, ...props.dayNames }
        const schedule: WeeklySchedule = (field.state.value as WeeklySchedule) || props.defaultSchedule

        const invalidDays = props.days.filter((day) => {
          const daySchedule = schedule[day]
          return daySchedule && !isValidTimeRange(daySchedule.open, daySchedule.close)
        })

        const handleDayToggle = (day: DayOfWeek, enabled: boolean) => {
          field.handleChange({
            ...schedule,
            [day]: enabled ? { open: props.defaultOpenTime, close: props.defaultCloseTime } : null,
          })
        }

        const handleTimeChange = (day: DayOfWeek, timeField: 'open' | 'close', value: string) => {
          const current = schedule[day]
          if (!current) { return }
          field.handleChange({ ...schedule, [day]: { ...current, [timeField]: value } })
        }

        const handleCopyToWeekdays = () => {
          const mondaySchedule = schedule.monday
          if (!mondaySchedule) { return }
          field.handleChange({
            ...schedule,
            tuesday: mondaySchedule,
            wednesday: mondaySchedule,
            thursday: mondaySchedule,
            friday: mondaySchedule,
          })
        }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h('div', { class: 'letar-field__schedule', 'data-field-name': props.name }, [
            invalidDays.length > 0
              ? h(
                'p',
                { class: 'letar-field__schedule-warning' },
                `Время закрытия должно быть позже открытия: ${invalidDays.map((d) => mergedDayNames[d]).join(', ')}`,
              )
              : null,
            props.showCopyToWeekdays && props.days.includes('monday')
              ? h('button', {
                type: 'button',
                disabled: !schedule.monday,
                class: 'letar-field__schedule-copy',
                onClick: handleCopyToWeekdays,
              }, props.copyToWeekdaysLabel)
              : null,
            ...props.days.map((day) => {
              const daySchedule = schedule[day]
              const isEnabled = daySchedule !== null && daySchedule !== undefined
              return h('div', { key: day, 'data-day': day, class: 'letar-field__schedule-day' }, [
                h('label', { class: 'letar-field__schedule-day-toggle' }, [
                  h('input', {
                    type: 'checkbox',
                    role: 'switch',
                    checked: isEnabled,
                    'data-day-switch': day,
                    onChange: (e: Event) => handleDayToggle(day, (e.target as HTMLInputElement).checked),
                  }),
                  h('span', {}, mergedDayNames[day]),
                ]),
                isEnabled
                  ? h('span', { class: 'letar-field__schedule-day-times' }, [
                    h('input', {
                      type: 'time',
                      value: daySchedule?.open || props.defaultOpenTime,
                      onChange: (e: Event) => handleTimeChange(day, 'open', (e.target as HTMLInputElement).value),
                    }),
                    h('input', {
                      type: 'time',
                      value: daySchedule?.close || props.defaultCloseTime,
                      onChange: (e: Event) => handleTimeChange(day, 'close', (e.target as HTMLInputElement).value),
                    }),
                  ])
                  : h('span', { class: 'letar-field__schedule-day-off' }, props.offLabel),
              ])
            }),
          ]),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
