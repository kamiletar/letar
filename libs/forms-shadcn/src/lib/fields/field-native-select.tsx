'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { NativeSelectFieldProps } from './types'

/** Form.Field.NativeSelect — shadcn-скин. Нативный `<select>`, лучший UX на мобильных. */
export const FieldNativeSelect = createField<NativeSelectFieldProps, string>({
  displayName: 'FieldNativeSelect',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <shadcnUIKit.NativeSelect
        value={(field.state.value as string) ?? ''}
        onChange={(value) =>
          field.handleChange(value)}
        onBlur={field.handleBlur}
        options={componentProps.options}
        placeholder={resolved.placeholder}
        disabled={resolved.disabled}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
