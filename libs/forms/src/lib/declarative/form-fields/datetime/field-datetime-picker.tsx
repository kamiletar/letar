'use client'

import { Field, HStack, Input } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { DateTimePickerFieldProps } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Parses a datetime string into separate date and time parts
 */
function parseDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) {
    return { date: '', time: '' }
  }

  // Handle ISO format: 2024-01-15T14:30:00
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/)
  if (match) {
    return { date: match[1], time: match[2] || '' }
  }

  return { date: '', time: '' }
}

/**
 * Combines date and time into an ISO datetime string
 */
function combineDateTime(date: string, time: string): string {
  if (!date) {
    return ''
  }
  if (!time) {
    return date
  }
  return `${date}T${time}:00`
}

/**
 * Form.Field.DateTimePicker - Combined date and time picker
 *
 * Renders date and time fields that produce an ISO datetime string.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.DateTimePicker name="appointmentAt" label="Appointment" />
 * ```
 *
 * @example With min/max constraints
 * ```tsx
 * <Form.Field.DateTimePicker
 *   name="eventAt"
 *   minDateTime={new Date()}
 *   maxDateTime="2025-12-31T23:59"
 * />
 * ```
 */
export const FieldDateTimePicker = createField<DateTimePickerFieldProps, string>({
  displayName: 'FieldDateTimePicker',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { minDateTime, maxDateTime, timeStep = 15 } = componentProps

    // Convert Date to string if needed
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
      const combined = combineDateTime(newDate, time)
      field.handleChange(combined || undefined)
    }

    const handleTimeChange = (newTime: string) => {
      const combined = combineDateTime(date, newTime)
      field.handleChange(combined || undefined)
    }

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
        <HStack gap={2}>
          <Input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            onBlur={field.handleBlur}
            min={minDate}
            max={maxDate}
            data-field-name={`${fullPath}-date`}
            flex={1}
          />
          <Input
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            onBlur={field.handleBlur}
            step={timeStep * 60}
            data-field-name={`${fullPath}-time`}
            width="150px"
          />
        </HStack>
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
