'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '../utils/cn'
import type { YesNoFieldProps } from './types'

const VARIANT_CONTENT: Record<NonNullable<YesNoFieldProps['variant']>, { yes: string | null; no: string | null }> = {
  buttons: { yes: null, no: null },
  thumbs: { yes: '👍', no: '👎' },
  emoji: { yes: '😊', no: '😞' },
}

/**
 * Form.Field.YesNo — shadcn-скин. Значение — `boolean`.
 *
 * Два кликабельных блока (`role="radio"` внутри `role="radiogroup"`, тот же подход, что у
 * `FieldRadioCard`/`FieldListbox`) для бинарного выбора — согласия, подтверждения, простые
 * опросы. Без нового Radix-примитива, портирован из Chakra-версии (`field-yes-no.tsx`) почти
 * без изменений логики.
 */
export const FieldYesNo = createField<YesNoFieldProps, boolean>({
  displayName: 'FieldYesNo',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { yesLabel = 'Да', noLabel = 'Нет', variant = 'buttons' } = componentProps
    const value = field.state.value as boolean | undefined
    const icons = VARIANT_CONTENT[variant]
    const disabled = resolved.disabled || resolved.readOnly

    const handleSelect = (val: boolean) => {
      if (disabled) {
        return
      }
      field.handleChange(val)
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div
          role="radiogroup"
          aria-label={typeof resolved.label === 'string' ? resolved.label : undefined}
          data-field-name={fullPath}
          className="flex gap-3"
        >
          <button
            type="button"
            role="radio"
            aria-checked={value === true}
            disabled={disabled}
            onClick={() => handleSelect(true)}
            className={cn(
              'flex-1 rounded-lg border-2 p-4 text-center transition-colors',
              value === true
                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                : 'border-border hover:border-green-400',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {icons.yes && <span className="mb-1 block text-2xl">{icons.yes}</span>}
            <span className="font-medium">{yesLabel}</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={value === false}
            disabled={disabled}
            onClick={() => handleSelect(false)}
            className={cn(
              'flex-1 rounded-lg border-2 p-4 text-center transition-colors',
              value === false
                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                : 'border-border hover:border-red-400',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {icons.no && <span className="mb-1 block text-2xl">{icons.no}</span>}
            <span className="font-medium">{noLabel}</span>
          </button>
        </div>
      </FieldWrapper>
    )
  },
})
