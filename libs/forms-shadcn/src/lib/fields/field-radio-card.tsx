'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cardClass } from '../utils/card-class'
import { cn } from '../utils/cn'
import type { RadioCardFieldProps, RichOption } from './types'

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
