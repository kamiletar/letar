'use client'

import { useFormI18n } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { NumberFieldProps } from './types'

interface NumberFieldState {
  locale: string | undefined
}

/** Form.Field.Number — shadcn-скин. Текстовый спинбаттон (см. `uikit/primitives/number-input.tsx`). */
export const FieldNumber = createField<NumberFieldProps, number | null, NumberFieldState>({
  displayName: 'FieldNumber',

  useFieldState: (): NumberFieldState => ({ locale: useFormI18n()?.locale }),

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <shadcnUIKit.NumberInput
        value={(field.state.value as number | null) ?? null}
        onChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        min={componentProps.min}
        max={componentProps.max}
        step={componentProps.step}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        locale={fieldState.locale}
        data-field-name={fullPath}
      />
    </FieldWrapper>
  ),
})
