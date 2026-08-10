'use client'

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { CurrencyFieldProps } from './types'

interface CurrencyFieldState {
  symbol: string
}

/**
 * Form.Field.Currency — shadcn-скин.
 *
 * Beta-упрощение относительно Chakra-версии: `shadcnUIKit.NumberInput` — обычное число, без
 * живого Intl-форматирования внутри инпута при вводе (Chakra `NumberInput.Root formatOptions`
 * форматирует посимвольно, у UIKit-контракта такого примитива нет). Символ валюты — соседний
 * `<span>` после инпута, определяется через `Intl.NumberFormat` один раз (не форматирует само
 * значение — только достаёт символ).
 */
export const FieldCurrency = createField<CurrencyFieldProps, number | undefined, CurrencyFieldState>({
  displayName: 'FieldCurrency',

  useFieldState: (props): CurrencyFieldState => {
    const { currency = 'RUB', currencyDisplay = 'symbol' } = props
    const symbol = useMemo(() => {
      const parts = new Intl.NumberFormat('ru-RU', { style: 'currency', currency, currencyDisplay }).formatToParts(0)
      return parts.find((p) => p.type === 'currency')?.value ?? currency
    }, [currency, currencyDisplay])

    return { symbol }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { min, max, step = 0.01 } = componentProps
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
          <span className="text-muted-foreground text-sm">{fieldState.symbol}</span>
        </div>
      </FieldWrapper>
    )
  },
})
