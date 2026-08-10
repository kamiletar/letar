'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '../utils/cn'
import type { DateTimePickerFieldProps } from './types'

// Те же классы, что у shadcnUIKit.Input (uikit/primitives/input.tsx) — нативный <input>, а не
// примитив контракта: date-инпуту нужен min/max, time-инпуту нужен step, UIKitInputProps их не
// пропускает (тот же случай, что у FieldDateRange).
const DATETIME_INPUT_CLASS = cn(
  'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
)

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

/**
 * Form.Field.DateTimePicker — shadcn-скин.
 *
 * Значение — строка ISO (`YYYY-MM-DDTHH:MM:00`), тот же контракт, что у Chakra-версии.
 * Два нативных инпута (`type="date"` + `type="time"`) рядом.
 */
export const FieldDateTimePicker = createField<DateTimePickerFieldProps, string>({
  displayName: 'FieldDateTimePicker',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { minDateTime, maxDateTime, timeStep = 15 } = componentProps

    const minDateTimeStr = minDateTime instanceof Date
      ? minDateTime.toISOString().slice(0, 16)
      : minDateTime?.slice(0, 16)
    const maxDateTimeStr = maxDateTime instanceof Date
      ? maxDateTime.toISOString().slice(0, 16)
      : maxDateTime?.slice(0, 16)

    const minDate = minDateTimeStr?.slice(0, 10)
    const maxDate = maxDateTimeStr?.slice(0, 10)

    const value = field.state.value as string | undefined
    const { date, time } = parseDateTime(value)

    const handleDateChange = (newDate: string) => {
      field.handleChange(combineDateTime(newDate, time) || undefined)
    }

    const handleTimeChange = (newTime: string) => {
      field.handleChange(combineDateTime(date, newTime) || undefined)
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            onBlur={field.handleBlur}
            min={minDate}
            max={maxDate}
            disabled={resolved.disabled}
            readOnly={resolved.readOnly}
            data-field-name={`${fullPath}-date`}
            className={cn(DATETIME_INPUT_CLASS, 'flex-1')}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            onBlur={field.handleBlur}
            step={timeStep * 60}
            disabled={resolved.disabled}
            readOnly={resolved.readOnly}
            data-field-name={`${fullPath}-time`}
            className={cn(DATETIME_INPUT_CLASS, 'w-[150px]')}
          />
        </div>
      </FieldWrapper>
    )
  },
})
