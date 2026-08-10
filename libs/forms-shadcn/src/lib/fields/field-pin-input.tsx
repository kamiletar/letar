'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { PinInputFieldProps } from './types'

/** Form.Field.PinInput — shadcn-скин. Нативные `<input maxLength=1>` с автопереходом. */
export const FieldPinInput = createField<PinInputFieldProps, string>({
  displayName: 'FieldPinInput',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <shadcnUIKit.PinInput
        value={(field.state.value as string) ?? ''}
        onChange={(value) =>
          field.handleChange(value)}
        onComplete={componentProps.onComplete}
        length={componentProps.length ?? 4}
        mask={componentProps.mask}
        disabled={resolved.disabled}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
