'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { DurationFieldProps } from './types'

function minutesToHHMM(minutes: number): { hours: number; mins: number } {
  return { hours: Math.floor(minutes / 60), mins: minutes % 60 }
}

function hhmmToMinutes(hours: number, mins: number): number {
  return hours * 60 + mins
}

/**
 * Form.Field.Duration — shadcn-скин.
 *
 * Значение хранится как число минут — тот же контракт, что у Chakra-версии. Два формата:
 * `minutes` (один `NumberInput`) и `HH:MM` (два `NumberInput` рядом, по умолчанию).
 */
export const FieldDuration = createField<DurationFieldProps, number>({
  displayName: 'FieldDuration',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { format = 'HH:MM', min = 0, max = 1440, step = 15 } = componentProps
    const value = (field.state.value as number) ?? 0
    const { hours, mins } = minutesToHHMM(value)

    const handleHoursChange = (newHours: number) => {
      field.handleChange(Math.max(min, Math.min(max, hhmmToMinutes(newHours, mins))))
    }

    const handleMinsChange = (newMins: number) => {
      field.handleChange(Math.max(min, Math.min(max, hhmmToMinutes(hours, newMins))))
    }

    const handleMinutesChange = (newValue: number) => {
      field.handleChange(Math.max(min, Math.min(max, newValue)))
    }

    if (format === 'minutes') {
      return (
        <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
          <shadcnUIKit.NumberInput
            value={value}
            onChange={(v) => {
              if (v !== null) { handleMinutesChange(v) }
            }}
            onBlur={field.handleBlur}
            min={min}
            max={max}
            step={step}
            disabled={resolved.disabled}
            readOnly={resolved.readOnly}
            data-field-name={fullPath}
          />
        </FieldWrapper>
      )
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="flex items-center gap-2">
          <div className="w-20">
            <shadcnUIKit.NumberInput
              value={hours}
              onChange={(v) => {
                if (v !== null) { handleHoursChange(v) }
              }}
              onBlur={field.handleBlur}
              min={0}
              max={Math.floor(max / 60)}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={`${fullPath}-hours`}
            />
          </div>
          <span className="font-bold">:</span>
          <div className="w-20">
            <shadcnUIKit.NumberInput
              value={mins}
              onChange={(v) => {
                if (v !== null) { handleMinsChange(v) }
              }}
              onBlur={field.handleBlur}
              min={0}
              max={59}
              step={step}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={`${fullPath}-mins`}
            />
          </div>
        </div>
      </FieldWrapper>
    )
  },
})
