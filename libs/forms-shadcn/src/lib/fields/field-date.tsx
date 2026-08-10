'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { DateFieldProps } from './types'

/**
 * Form.Field.Date — shadcn-скин.
 *
 * Beta-упрощение: нативный `<input type="date">` через core-примитив `Input` (контракт уже
 * поддерживает `type`), не Radix/Ark date picker с попапом-календарём. Значение — строка
 * `YYYY-MM-DD`, как отдаёт сам браузер.
 */
export const FieldDate = createField<DateFieldProps, string>({
  displayName: 'FieldDate',
  render: ({ field, fullPath, resolved, hasError, errorMessage }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <shadcnUIKit.Input
        type="date"
        value={(field.state.value as string) ?? ''}
        onChange={(value) =>
          field.handleChange(value)}
        onBlur={field.handleBlur}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
