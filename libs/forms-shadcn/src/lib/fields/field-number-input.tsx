'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { cn } from '@letar/tailwind-utils'
import type { NumberInputFieldProps } from './types'

/**
 * Form.Field.NumberInput — shadcn-скин. Как `Form.Field.Number`, но с видимыми
 * степпер-кнопками (increment/decrement) поверх `shadcnUIKit.NumberInput` — тот же примитив,
 * что у `FieldNumber`/`FieldCurrency`/`FieldPercentage`.
 */
export const FieldNumberInput = createField<NumberInputFieldProps, number | undefined>({
  displayName: 'FieldNumberInput',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { min, max, step = 1 } = componentProps
    const value = field.state.value as number | undefined
    const disabled = resolved.disabled || resolved.readOnly

    const clamp = (v: number): number => {
      let next = v
      if (min !== undefined) {
        next = Math.max(min, next)
      }
      if (max !== undefined) {
        next = Math.min(max, next)
      }
      return next
    }

    const step_ = (delta: number) => {
      if (disabled) {
        return
      }
      field.handleChange(clamp((value ?? 0) + delta))
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="relative">
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
          <div className="absolute inset-y-0 right-1 flex flex-col justify-center py-0.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Увеличить"
              disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
              onClick={() => step_(step)}
              className={cn(
                'text-muted-foreground hover:text-foreground flex h-3.5 w-4 items-center justify-center',
                'disabled:pointer-events-none disabled:opacity-30',
              )}
            >
              <ChevronUp className="size-3" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Уменьшить"
              disabled={disabled || (min !== undefined && (value ?? 0) <= min)}
              onClick={() => step_(-step)}
              className={cn(
                'text-muted-foreground hover:text-foreground flex h-3.5 w-4 items-center justify-center',
                'disabled:pointer-events-none disabled:opacity-30',
              )}
            >
              <ChevronDown className="size-3" />
            </button>
          </div>
        </div>
      </FieldWrapper>
    )
  },
})
