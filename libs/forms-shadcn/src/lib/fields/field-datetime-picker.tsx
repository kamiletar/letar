'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { cn } from '@letar/tailwind-utils'
import type { DateTimePickerFieldProps } from './types'

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
            className={cn(NATIVE_INPUT_CLASS, 'flex-1')}
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
            className={cn(NATIVE_INPUT_CLASS, 'w-[150px]')}
          />
        </div>
      </FieldWrapper>
    )
  },
})
