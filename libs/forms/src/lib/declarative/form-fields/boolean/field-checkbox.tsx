'use client'

import { HStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { CheckboxFieldProps } from '../../types'
import { chakraUIKit, createField } from '../base'
import { FieldTooltip } from '../base/field-tooltip'

/**
 * Form.Field.Checkbox - Boolean checkbox field
 *
 * Renders a Chakra Checkbox with automatic form integration and error display.
 *
 * @example
 * ```tsx
 * <Form.Field.Checkbox name="active" label="Active" />
 * ```
 *
 * @example With color palette
 * ```tsx
 * <Form.Field.Checkbox name="terms" label="Accept terms" colorPalette="green" />
 * ```
 *
 * Uses the `UIKit` contract (`@letar/forms-core/uikit`) instead of importing Chakra directly —
 * Фаза 7.1, Этап 4 proof that the seam covers a binary field, not just a text input.
 */
export const FieldCheckbox = createField<CheckboxFieldProps, boolean>({
  displayName: 'FieldCheckbox',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <chakraUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
      <chakraUIKit.Checkbox
        checked={!!field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        colorPalette={componentProps.colorPalette ?? 'brand'}
        size={componentProps.size ?? 'md'}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        label={resolved.label
          ? (
            resolved.tooltip
              ? (
                <HStack gap={1}>
                  <span>{resolved.label}</span>
                  <FieldTooltip {...resolved.tooltip} />
                </HStack>
              )
              : (
                resolved.label
              )
          )
          : undefined}
        data-field-name={fullPath}
      />
      <chakraUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </chakraUIKit.FieldRoot>
  ),
})
