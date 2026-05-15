'use client'

import { Checkbox, Field, HStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { CheckboxFieldProps } from '../../types'
import { createField, FieldError } from '../base'
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
 */
export const FieldCheckbox = createField<CheckboxFieldProps, boolean>({
  displayName: 'FieldCheckbox',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <Field.Root
      invalid={hasError}
      required={resolved.required}
      disabled={resolved.disabled}
      readOnly={resolved.readOnly}
    >
      <Checkbox.Root
        checked={!!field.state.value}
        onCheckedChange={(e) => field.handleChange(!!e.checked)}
        colorPalette={componentProps.colorPalette ?? 'brand'}
        size={componentProps.size ?? 'md'}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        data-field-name={fullPath}
      >
        <Checkbox.HiddenInput onBlur={field.handleBlur} />
        <Checkbox.Control />
        {resolved.label && (
          <Checkbox.Label>
            {resolved.tooltip ? (
              <HStack gap={1}>
                <span>{resolved.label}</span>
                <FieldTooltip {...resolved.tooltip} />
              </HStack>
            ) : (
              resolved.label
            )}
          </Checkbox.Label>
        )}
      </Checkbox.Root>
      <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </Field.Root>
  ),
})
