'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { SegmentGroupFieldProps } from './types'

/** Form.Field.SegmentGroup — shadcn-скин (`@radix-ui/react-toggle-group`, `type="single"`). */
export const FieldSegmentGroup = createField<SegmentGroupFieldProps, string>({
  displayName: 'FieldSegmentGroup',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <shadcnUIKit.SegmentGroup
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
