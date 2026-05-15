'use client'

import { Input } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { TimeFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.Time - Time input field
 *
 * Renders a native time input with automatic form integration and error display.
 *
 * @example
 * ```tsx
 * <Form.Field.Time name="startTime" label="Start Time" />
 * ```
 *
 * @example With step (seconds)
 * ```tsx
 * <Form.Field.Time name="duration" label="Duration" step={60} />
 * ```
 */
export const FieldTime = createField<TimeFieldProps, string>({
  displayName: 'FieldTime',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <Input
        type="time"
        value={(field.state.value as string) ?? ''}
        onChange={(e) => field.handleChange((e.target as HTMLInputElement).value)}
        onBlur={field.handleBlur}
        placeholder={resolved.placeholder}
        min={componentProps.min}
        max={componentProps.max}
        step={componentProps.step}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
