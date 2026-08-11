'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { cn } from '@letar/tailwind-utils'
import type { DayOfWeek, ScheduleFieldProps, WeeklySchedule } from './types'

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
 * Form.Field.Schedule — shadcn-скин.
 *
 * Редактор недельного расписания: toggle дня, время open/close, копирование понедельника на
 * будни, проверка `close > open` с визуальным предупреждением. Портирован из Chakra-версии без
 * изменений логики.
 */
export const FieldSchedule = createField<ScheduleFieldProps, WeeklySchedule>({
  displayName: 'FieldSchedule',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      dayNames = {},
      defaultSchedule = DEFAULT_WORKING_HOURS,
      days = DAYS_OF_WEEK,
      showCopyToWeekdays = true,
      offLabel = 'Выходной',
      copyToWeekdaysLabel = 'Скопировать Пн на будни',
      defaultOpenTime = '09:00',
      defaultCloseTime = '18:00',
    } = componentProps
    const mergedDayNames = { ...DEFAULT_DAY_NAMES, ...dayNames }
    const schedule: WeeklySchedule = (field.state.value as WeeklySchedule) || defaultSchedule
    const disabled = resolved.disabled || resolved.readOnly

    const invalidDays = days.filter((day) => {
      const daySchedule = schedule[day]
      return daySchedule && !isValidTimeRange(daySchedule.open, daySchedule.close)
    })

    const handleDayToggle = (day: DayOfWeek, enabled: boolean) => {
      field.handleChange({
        ...schedule,
        [day]: enabled ? { open: defaultOpenTime, close: defaultCloseTime } : null,
      })
    }

    const handleTimeChange = (day: DayOfWeek, timeField: 'open' | 'close', value: string) => {
      const current = schedule[day]
      if (!current) {
        return
      }
      field.handleChange({ ...schedule, [day]: { ...current, [timeField]: value } })
    }

    const handleCopyToWeekdays = () => {
      const mondaySchedule = schedule.monday
      if (!mondaySchedule) {
        return
      }
      field.handleChange({
        ...schedule,
        tuesday: mondaySchedule,
        wednesday: mondaySchedule,
        thursday: mondaySchedule,
        friday: mondaySchedule,
      })
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div data-field-name={fullPath} className="flex flex-col gap-3">
          {invalidDays.length > 0 && (
            <div className="border-destructive/30 bg-destructive/10 rounded-md border p-3">
              <p className="text-destructive text-sm font-medium">
                Время закрытия должно быть позже открытия: {invalidDays.map((d) => mergedDayNames[d]).join(', ')}
              </p>
            </div>
          )}

          {showCopyToWeekdays && days.includes('monday') && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Быстрые действия:</span>
              <button
                type="button"
                disabled={disabled || !schedule.monday}
                onClick={handleCopyToWeekdays}
                className="text-primary text-xs font-medium hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                {copyToWeekdaysLabel}
              </button>
            </div>
          )}

          {days.map((day) => {
            const daySchedule = schedule[day]
            const isEnabled = daySchedule !== null && daySchedule !== undefined
            const dayHasError = invalidDays.includes(day)

            return (
              <div
                key={day}
                data-day={day}
                className={cn(
                  'rounded-md border p-3',
                  dayHasError ? 'border-destructive/40 bg-destructive/5' : isEnabled ? 'bg-card' : 'bg-muted/50',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-[140px] items-center gap-3">
                    <SwitchPrimitive.Root
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleDayToggle(day, checked)}
                      disabled={disabled}
                      data-day-switch={day}
                      className={cn(
                        'bg-input focus-visible:ring-ring/50 peer inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors',
                        'data-[state=checked]:bg-primary',
                        'focus-visible:ring-[3px]',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      <SwitchPrimitive.Thumb
                        className={cn(
                          'bg-background block size-4 rounded-full shadow-lg transition-transform',
                          'translate-x-0.5 data-[state=checked]:translate-x-4',
                        )}
                      />
                    </SwitchPrimitive.Root>
                    <span className={cn('text-sm font-medium', !isEnabled && 'text-muted-foreground')}>
                      {mergedDayNames[day]}
                    </span>
                  </div>

                  {isEnabled
                    ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={daySchedule?.open || defaultOpenTime}
                          onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                          disabled={disabled}
                          className={cn(NATIVE_INPUT_CLASS, 'h-8 w-[110px] text-sm')}
                        />
                        <span className="text-muted-foreground">—</span>
                        <input
                          type="time"
                          value={daySchedule?.close || defaultCloseTime}
                          onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                          disabled={disabled}
                          className={cn(NATIVE_INPUT_CLASS, 'h-8 w-[110px] text-sm')}
                        />
                      </div>
                    )
                    : <span className="text-muted-foreground text-sm">{offLabel}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </FieldWrapper>
    )
  },
})
