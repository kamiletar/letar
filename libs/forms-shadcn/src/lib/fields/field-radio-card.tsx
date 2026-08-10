'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '../utils/cn'
import type { RadioCardFieldProps, RichOption } from './types'

function cardClass(selected: boolean, disabled: boolean | undefined): string {
  return cn(
    'flex flex-1 flex-col gap-1 rounded-md border p-3 text-left text-sm outline-none',
    selected ? 'border-primary ring-primary/50 ring-2' : 'border-input hover:bg-accent/50',
    disabled && 'pointer-events-none opacity-50',
  )
}

/**
 * Form.Field.RadioCard — shadcn-скин.
 *
 * Одиночный выбор карточками (label/description/icon), не набор мелких кружков. Без нового
 * Radix-примитива — обычные кнопки с `role="radio"` в контейнере `role="radiogroup"`, тот же
 * подход, что у `FieldListbox`. Beta: без `keyboardNavigation` (циклическая навигация
 * стрелками) — Chakra-версия её поддерживает опционально, здесь не портировано.
 */
export const FieldRadioCard = createField<RadioCardFieldProps, string>({
  displayName: 'FieldRadioCard',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { options, orientation = 'horizontal' } = componentProps
    const currentValue = field.state.value as string | undefined

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div
          role="radiogroup"
          aria-label={typeof resolved.label === 'string' ? resolved.label : undefined}
          data-field-name={fullPath}
          className={cn('flex gap-2', orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col')}
        >
          {options.map((opt: RichOption) => {
            const optValue = String(opt.value)
            const selected = currentValue === optValue
            return (
              <button
                key={optValue}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={opt.disabled || resolved.disabled}
                onClick={() => field.handleChange(optValue)}
                className={cardClass(selected, opt.disabled)}
              >
                {opt.icon}
                <span className="font-medium">{opt.label}</span>
                {opt.description && <span className="text-muted-foreground text-xs">{opt.description}</span>}
              </button>
            )
          })}
        </div>
      </FieldWrapper>
    )
  },
})
