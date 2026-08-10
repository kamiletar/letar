'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { PercentageFieldProps } from './types'

/**
 * Form.Field.Percentage — shadcn-скин.
 *
 * Значение хранится как есть (50 = 50%), тот же контракт, что у Chakra-версии. Beta-упрощение:
 * `%` — соседний `<span>`, не встроенное Intl-форматирование внутри инпута (тот же принцип, что
 * у `FieldCurrency`).
 */
export const FieldPercentage = createField<PercentageFieldProps, number | undefined>({
  displayName: 'FieldPercentage',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { min = 0, max = 100, step = 1 } = componentProps
    const value = field.state.value as number | undefined

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <shadcnUIKit.NumberInput
              value={value ?? null}
              onChange={(v) => field.handleChange(v ?? undefined)}
              onBlur={field.handleBlur}
              min={min}
              max={max}
              step={step}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={fullPath}
            />
          </div>
          <span className="text-muted-foreground text-sm">%</span>
        </div>
      </FieldWrapper>
    )
  },
})
