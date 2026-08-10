'use client'

import type { ReactElement } from 'react'
import { createField } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { CheckboxFieldProps } from './types'

/** Form.Field.Checkbox — shadcn-скин. */
export const FieldCheckbox = createField<CheckboxFieldProps, boolean>({
  displayName: 'FieldCheckbox',
  render: ({ field, fullPath, resolved, hasError, errorMessage }): ReactElement => (
    <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
      <shadcnUIKit.Checkbox
        checked={!!field.state.value}
        onCheckedChange={(checked) =>
          field.handleChange(checked)}
        onBlur={field.handleBlur}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        label={resolved.label}
        data-field-name={fullPath}
      />
      <shadcnUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </shadcnUIKit.FieldRoot>
  ),
})
