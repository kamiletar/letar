'use client'

import { cn } from '@letar/tailwind-utils'
import { Star } from 'lucide-react'
import type { ReactElement } from 'react'
import { createField } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { RatingFieldProps } from './types'

/**
 * Form.Field.Rating — shadcn-скин. Ряд кнопок-звёзд, не входит в UIKit-контракт (нет `Rating`
 * в `UIKitExtendedPrimitives`) — тот же принцип, что у `Switch`/`Slider`.
 */
export const FieldRating = createField<RatingFieldProps, number>({
  displayName: 'FieldRating',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const count = componentProps.count ?? 5
    const value = (field.state.value as number) ?? 0

    return (
      <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <shadcnUIKit.FieldLabel label={resolved.label} required={resolved.required} tooltip={resolved.tooltip} />
        <div role="radiogroup" data-field-name={fullPath} className="flex gap-1">
          {Array.from({ length: count }, (_, i) => i + 1).map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} из ${count}`}
              disabled={resolved.disabled}
              onClick={() => field.handleChange(star)}
              onBlur={field.handleBlur}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Star
                className={cn(
                  'size-5',
                  star <= value ? 'fill-primary text-primary' : 'text-muted-foreground',
                )}
              />
            </button>
          ))}
        </div>
        <shadcnUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </shadcnUIKit.FieldRoot>
    )
  },
})
