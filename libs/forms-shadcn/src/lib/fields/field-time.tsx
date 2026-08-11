'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import type { TimeFieldProps } from './types'

/**
 * Form.Field.Time — shadcn-скин.
 *
 * Нативный `<input type="time">` в обход `UIKitInputProps` (не пропускает `min`/`max`/`step`) —
 * тот же приём, что у `FieldDateRange`/`FieldDateTimePicker` (`NATIVE_INPUT_CLASS`).
 */
export const FieldTime = createField<TimeFieldProps, string>({
  displayName: 'FieldTime',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <input
        type="time"
        value={(field.state.value as string) ?? ''}
        onChange={(e) =>
          field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        min={componentProps.min}
        max={componentProps.max}
        step={componentProps.step}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        data-field-name={fullPath}
        className={NATIVE_INPUT_CLASS}
      />
    </FieldWrapper>
  ),
})
