'use client'

import { Field, HStack, RatingGroup } from '@chakra-ui/react'
import type React from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { BaseFieldProps } from '../../types'
import { createField, FieldError } from '../base'
import { FieldTooltip } from '../base/field-tooltip'

/**
 * Props for Rating field
 */
export interface RatingFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Number of rating elements (by default: 5) */
  count?: number
  /** Allow half values (by default: false) */
  allowHalf?: boolean
  /** Size: xs, sm, md, lg (by default: md) */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Color palette (by default: gray) */
  colorPalette?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'cyan' | 'purple' | 'pink'
  /** Custom icon (by default: star) */
  icon?: ReactNode
  /** Callback on value change */
  onValueChange?: (value: number) => void
}

/**
 * Form.Field.Rating - Star rating input field
 *
 * Renders Chakra RatingGroup with automatic form integration.
 * Form value is stored as number.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Rating name="rating" label="Rating" />
 * ```
 *
 * @example With custom count and color
 * ```tsx
 * <Form.Field.Rating
 *   name="quality"
 *   label="Quality"
 *   count={10}
 *   colorPalette="orange"
 * />
 * ```
 *
 * @example With half values
 * ```tsx
 * <Form.Field.Rating
 *   name="score"
 *   label="Score"
 *   allowHalf
 *   size="lg"
 * />
 * ```
 */
export const FieldRating = createField<RatingFieldProps, number>({
  displayName: 'FieldRating',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { count = 5, allowHalf = false, size = 'md', colorPalette, icon, onValueChange } = componentProps

    const value = (field.state.value as number) ?? 0

    const handleValueChange = (details: { value: number }) => {
      field.handleChange(details.value)
      onValueChange?.(details.value)
    }

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <RatingGroup.Root
          value={value}
          onValueChange={handleValueChange}
          count={count}
          allowHalf={allowHalf}
          size={size}
          colorPalette={colorPalette}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          data-field-name={fullPath}
        >
          {resolved.label && (
            <RatingGroup.Label>
              {resolved.tooltip ? (
                <HStack gap={1}>
                  <span>{resolved.label}</span>
                  <FieldTooltip {...resolved.tooltip} />
                </HStack>
              ) : (
                resolved.label
              )}
            </RatingGroup.Label>
          )}
          <RatingGroup.HiddenInput onBlur={field.handleBlur} />
          <RatingGroup.Control>
            {Array.from({ length: count }).map((_, index) => (
              <RatingGroup.Item key={index} index={index + 1}>
                <RatingGroup.ItemIndicator icon={icon as React.ReactElement | undefined} />
              </RatingGroup.Item>
            ))}
          </RatingGroup.Control>
        </RatingGroup.Root>
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
