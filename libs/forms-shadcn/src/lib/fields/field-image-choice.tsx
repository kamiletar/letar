'use client'

import { Check } from 'lucide-react'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '@letar/tailwind-utils'
import type { ImageChoiceFieldProps, ImageChoiceOption } from './types'

/**
 * Form.Field.ImageChoice — shadcn-скин.
 *
 * Grid карточек с изображениями для визуального выбора. Портирован из Chakra-версии без
 * изменений логики (single/multiple selection, toggle). Beta: `columns` задаёт фиксированное
 * число колонок через inline `gridTemplateColumns`, без Chakra `SimpleGrid`-responsive
 * (`base=1, sm=2, md=columns`) — один и тот же grid на всех брейкпоинтах.
 */
export const FieldImageChoice = createField<ImageChoiceFieldProps, string | string[]>({
  displayName: 'FieldImageChoice',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { options, columns = 3, multiple = false } = componentProps
    const value = field.state.value as string | string[] | undefined
    const disabled = resolved.disabled || resolved.readOnly

    const isSelected = (optValue: string): boolean => {
      if (multiple) {
        return Array.isArray(value) && value.includes(optValue)
      }
      return value === optValue
    }

    const handleSelect = (optValue: string) => {
      if (disabled) {
        return
      }
      if (multiple) {
        const current = Array.isArray(value) ? value : []
        const next = current.includes(optValue) ? current.filter((v) => v !== optValue) : [...current, optValue]
        field.handleChange(next)
      } else {
        field.handleChange(optValue)
      }
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div
          role="group"
          data-field-name={fullPath}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {options.map((opt: ImageChoiceOption) => {
            const selected = isSelected(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                role={multiple ? 'checkbox' : 'radio'}
                aria-checked={selected}
                disabled={disabled}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'relative overflow-hidden rounded-lg border-2 text-left transition-colors',
                  selected ? 'border-primary' : 'border-border hover:border-primary/50',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {/* oxlint-disable-next-line no-img-element */}
                <img src={opt.image} alt={opt.label} className="h-[120px] w-full object-cover" />
                {selected && (
                  <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full">
                    <Check className="size-3.5" />
                  </span>
                )}
                <div className="p-2">
                  <p className="text-sm font-medium">{opt.label}</p>
                  {opt.description && <p className="text-muted-foreground text-xs">{opt.description}</p>}
                </div>
              </button>
            )
          })}
        </div>
      </FieldWrapper>
    )
  },
})
