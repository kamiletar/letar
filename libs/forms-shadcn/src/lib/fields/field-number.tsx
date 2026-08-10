'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { NumberFieldProps } from './types'

/** Form.Field.Number — shadcn-скин. Нативный `<input type="number">`, без степпера. */
export const FieldNumber = createField<NumberFieldProps, number | null>({
  displayName: 'FieldNumber',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <shadcnUIKit.NumberInput
        value={(field.state.value as number | null) ?? null}
        onChange={(value) =>
          field.handleChange(value)}
        onBlur={field.handleBlur}
        min={componentProps.min}
        max={componentProps.max}
        step={componentProps.step}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
