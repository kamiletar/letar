'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { RadioGroupFieldProps } from './types'

/** Form.Field.RadioGroup — shadcn-скин (`@radix-ui/react-radio-group`). */
export const FieldRadioGroup = createField<RadioGroupFieldProps, string>({
  displayName: 'FieldRadioGroup',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <shadcnUIKit.RadioGroup
        value={(field.state.value as string) ?? undefined}
        onValueChange={(value) =>
          field.handleChange(value)}
        options={componentProps.options}
        disabled={resolved.disabled}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
