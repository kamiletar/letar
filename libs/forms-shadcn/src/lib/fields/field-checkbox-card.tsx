'use client'

import { cn } from '@letar/tailwind-utils'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cardClass } from '../utils/card-class'
import type { CheckboxCardFieldProps, RichOption } from './types'

/**
 * Form.Field.CheckboxCard — shadcn-скин.
 *
 * Множественный выбор карточками (label/description/icon), тот же визуальный подход, что у
 * `FieldRadioCard`, только `role="checkbox"`/`aria-checked` и значение — массив. Без нового
 * Radix-примитива.
 */
export const FieldCheckboxCard = createField<CheckboxCardFieldProps, string[]>({
  displayName: 'FieldCheckboxCard',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { options, orientation = 'horizontal' } = componentProps
    const currentValue = (field.state.value as string[] | undefined) ?? []

    const toggle = (optValue: string) => {
      const next = currentValue.includes(optValue)
        ? currentValue.filter((v) => v !== optValue)
        : [...currentValue, optValue]
      field.handleChange(next)
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div
          role="group"
          aria-label={typeof resolved.label === 'string' ? resolved.label : undefined}
          data-field-name={fullPath}
          className={cn('flex gap-2', orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col')}
        >
          {options.map((opt: RichOption) => {
            const optValue = String(opt.value)
            const selected = currentValue.includes(optValue)
            return (
              <button
                key={optValue}
                type="button"
                role="checkbox"
                aria-checked={selected}
                disabled={opt.disabled || resolved.disabled}
                onClick={() => toggle(optValue)}
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
