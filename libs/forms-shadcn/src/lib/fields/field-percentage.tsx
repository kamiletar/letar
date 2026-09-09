'use client'

import { useFormI18n } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { PercentageFieldProps } from './types'

interface PercentageFieldState {
  locale: string | undefined
}

/**
 * Form.Field.Percentage — shadcn-скин.
 *
 * Значение хранится как есть (50 = 50%), тот же контракт, что у Chakra-версии. Beta-упрощение:
 * `%` — соседний `<span>`, не встроенное Intl-форматирование внутри инпута (тот же принцип, что
 * у `FieldCurrency`).
 */
export const FieldPercentage = createField<PercentageFieldProps, number | undefined, PercentageFieldState>({
  displayName: 'FieldPercentage',

  useFieldState: (): PercentageFieldState => ({ locale: useFormI18n()?.locale }),

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { min = 0, max = 100, step = 1, minorUnitScale = 1 } = componentProps
    const storedValue = field.state.value as number | undefined

    // Форма хранит/сериализует значение в minor units (базисные пункты), поле показывает/
    // принимает major units (%) — тот же принцип, что в Chakra-скине/Form.Field.Currency.
    const displayedValue = storedValue === undefined ? undefined : storedValue / minorUnitScale

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <shadcnUIKit.NumberInput
              value={displayedValue ?? null}
              onChange={(v) =>
                field.handleChange(
                  v === null || v === undefined ? undefined : minorUnitScale === 1 ? v : Math.round(v * minorUnitScale),
                )}
              onBlur={field.handleBlur}
              min={min}
              max={max}
              step={step}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              locale={fieldState.locale}
              data-field-name={fullPath}
            />
          </div>
          <span className="text-muted-foreground text-sm">%</span>
        </div>
      </FieldWrapper>
    )
  },
})
