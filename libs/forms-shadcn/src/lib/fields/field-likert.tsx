'use client'

import { cn } from '@letar/tailwind-utils'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import type { LikertFieldProps } from './types'

/**
 * Form.Field.Likert — shadcn-скин. Значение — `number` (1-based индекс точки).
 *
 * Шкала Лайкерта: точки с текстовыми якорями, `role="radio"` в `role="radiogroup"`, тот же
 * подход, что `FieldYesNo`/`FieldRadioCard`. Портирован из Chakra-версии без изменений логики.
 * Beta: один горизонтальный ряд с `flex-wrap` на все брейкпоинты, без раздельного мобильного
 * вертикального вида.
 */
export const FieldLikert = createField<LikertFieldProps, number>({
  displayName: 'FieldLikert',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { anchors, showNumbers = false } = componentProps
    const value = field.state.value as number | undefined
    const disabled = resolved.disabled || resolved.readOnly

    const handleSelect = (point: number) => {
      if (disabled) {
        return
      }
      field.handleChange(point)
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div
          role="radiogroup"
          aria-label={typeof resolved.label === 'string' ? resolved.label : undefined}
          data-field-name={fullPath}
          className="flex flex-wrap justify-between gap-3 py-2"
        >
          {anchors.map((anchor, i) => {
            const point = i + 1
            const selected = value === point
            return (
              <button
                key={point}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => handleSelect(point)}
                className={cn(
                  'flex max-w-20 flex-1 flex-col items-center gap-1 text-center',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {showNumbers && <span className="text-muted-foreground text-xs">{point}</span>}
                <span
                  className={cn(
                    'size-8 rounded-full border-2 transition-transform hover:scale-110',
                    selected ? 'border-primary bg-primary' : 'border-border bg-transparent',
                  )}
                />
                <span className={cn('text-xs', selected ? 'text-primary font-medium' : 'text-muted-foreground')}>
                  {anchor}
                </span>
              </button>
            )
          })}
        </div>
      </FieldWrapper>
    )
  },
})
