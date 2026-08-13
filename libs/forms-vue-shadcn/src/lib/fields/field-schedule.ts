import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

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
 * Редактор недельного расписания — toggle дня (`SwitchRoot`/`SwitchThumb`, тот же примитив, что
 * `FieldSwitch`), время open/close (`NATIVE_INPUT_CLASS`, как у `FieldDateRange`/`FieldTime`),
 * копирование понедельника на будни, проверка `close > open`. Портирован из
 * `forms-shadcn/field-schedule.tsx` (логика 1:1).
 */
export const FieldSchedule = defineComponent({
  name: 'FieldSchedule',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    dayNames: {
      type: Object as PropType<Partial<Record<DayOfWeek, string>>>,
      required: false,
      default: () => ({}),
    },
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

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { 'data-field-name': props.name, class: 'flex flex-col gap-3' }, [
            invalidDays.length > 0
              ? h('div', { class: 'border-destructive/30 bg-destructive/10 rounded-md border p-3' }, [
                h(
                  'p',
                  { class: 'text-destructive text-sm font-medium' },
                  `Время закрытия должно быть позже открытия: ${invalidDays.map((d) => mergedDayNames[d]).join(', ')}`,
                ),
              ])
              : null,
            props.showCopyToWeekdays && props.days.includes('monday')
              ? h('div', { class: 'flex flex-wrap items-center gap-2' }, [
                h('span', { class: 'text-muted-foreground text-sm' }, 'Быстрые действия:'),
                h('button', {
                  type: 'button',
                  disabled: !schedule.monday,
                  class:
                    'text-primary text-xs font-medium hover:underline disabled:pointer-events-none disabled:opacity-50',
                  onClick: handleCopyToWeekdays,
                }, props.copyToWeekdaysLabel),
              ])
              : null,
            ...props.days.map((day) => {
              const daySchedule = schedule[day]
              const isEnabled = daySchedule !== null && daySchedule !== undefined
              const dayHasError = invalidDays.includes(day)

              return h(
                'div',
                {
                  key: day,
                  'data-day': day,
                  class: cn(
                    'rounded-md border p-3',
                    dayHasError ? 'border-destructive/40 bg-destructive/5' : isEnabled ? 'bg-card' : 'bg-muted/50',
                  ),
                },
                [
                  h('div', { class: 'flex flex-wrap items-center justify-between gap-3' }, [
                    h('div', { class: 'flex min-w-[140px] items-center gap-3' }, [
                      h(
                        SwitchRoot,
                        {
                          modelValue: isEnabled,
                          'onUpdate:modelValue': ((checked: unknown) => handleDayToggle(day, checked === true)) as (
                            value: unknown,
                          ) => void,
                          'data-day-switch': day,
                          class: cn(
                            'bg-input focus-visible:ring-ring/50 peer inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors',
                            'data-[state=checked]:bg-primary',
                            'focus-visible:ring-[3px]',
                          ),
                        },
                        {
                          default: () =>
                            h(SwitchThumb, {
                              class: cn(
                                'bg-background block size-4 rounded-full shadow-lg transition-transform',
                                'translate-x-0.5 data-[state=checked]:translate-x-4',
                              ),
                            }),
                        },
                      ),
                      h(
                        'span',
                        { class: cn('text-sm font-medium', !isEnabled && 'text-muted-foreground') },
                        mergedDayNames[day],
                      ),
                    ]),
                    isEnabled
                      ? h('div', { class: 'flex items-center gap-2' }, [
                        h('input', {
                          type: 'time',
                          value: daySchedule?.open || props.defaultOpenTime,
                          class: cn(NATIVE_INPUT_CLASS, 'h-8 w-[110px] text-sm'),
                          onChange: (e: Event) => handleTimeChange(day, 'open', (e.target as HTMLInputElement).value),
                        }),
                        h('span', { class: 'text-muted-foreground' }, '—'),
                        h('input', {
                          type: 'time',
                          value: daySchedule?.close || props.defaultCloseTime,
                          class: cn(NATIVE_INPUT_CLASS, 'h-8 w-[110px] text-sm'),
                          onChange: (e: Event) => handleTimeChange(day, 'close', (e.target as HTMLInputElement).value),
                        }),
                      ])
                      : h('span', { class: 'text-muted-foreground text-sm' }, props.offLabel),
                  ]),
                ],
              )
            }),
          ]),
        })
      })
    }
  },
})
