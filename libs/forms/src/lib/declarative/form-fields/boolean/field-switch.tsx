'use client'

import { Field, HStack, Switch } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { SwitchFieldProps } from '../../types'
import { createField, FieldError } from '../base'
import { FieldTooltip } from '../base/field-tooltip'

/**
 * Form.Field.Switch - Boolean switch/toggle field
 *
 * Renders a Chakra Switch with automatic form integration and error display.
 *
 * @example
 * ```tsx
 * <Form.Field.Switch name="notifications" label="Enable notifications" />
 * ```
 *
 * @example With color palette and size
 * ```tsx
 * <Form.Field.Switch name="darkMode" label="Dark mode" colorPalette="purple" size="lg" />
 * ```
 */
export const FieldSwitch = createField<SwitchFieldProps, boolean>({
  displayName: 'FieldSwitch',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <Field.Root
      invalid={hasError}
      required={resolved.required}
      disabled={resolved.disabled}
      readOnly={resolved.readOnly}
    >
      <Switch.Root
        checked={!!field.state.value}
        onCheckedChange={(e) => field.handleChange(e.checked)}
        colorPalette={componentProps.colorPalette ?? 'brand'}
        size={componentProps.size ?? 'md'}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        data-field-name={fullPath}
      >
        <Switch.HiddenInput onBlur={field.handleBlur} />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        {resolved.label && (
          <Switch.Label>
            {resolved.tooltip ? (
              <HStack gap={1}>
                <span>{resolved.label}</span>
                <FieldTooltip {...resolved.tooltip} />
              </HStack>
            ) : (
              resolved.label
            )}
          </Switch.Label>
        )}
      </Switch.Root>
      <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </Field.Root>
  ),
})
