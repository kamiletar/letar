'use client'

import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '../utils/cn'
import type { CheckboxCardFieldProps, RichOption } from './types'

function cardClass(selected: boolean, disabled: boolean | undefined): string {
  return cn(
    'flex flex-1 flex-col gap-1 rounded-md border p-3 text-left text-sm outline-none',
    selected ? 'border-primary ring-primary/50 ring-2' : 'border-input hover:bg-accent/50',
    disabled && 'pointer-events-none opacity-50',
  )
}

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
