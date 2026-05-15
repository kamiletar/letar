'use client'

import { Field, RadioGroup } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps, BaseOption, FieldSize } from '../../types'
import { createField, FieldError, FieldLabel, getOptionLabel } from '../base'

/**
 * Props for RadioGroup field
 */
export interface RadioGroupFieldProps<T = string> extends Omit<BaseFieldProps, 'placeholder'> {
  /** Options for radio group */
  options: BaseOption<T>[]
  /** Orientation (by default: vertical) */
  orientation?: 'horizontal' | 'vertical'
  /** Size */
  size?: FieldSize
  /** Visual variant */
  variant?: 'outline' | 'subtle' | 'solid'
  /** Color palette */
  colorPalette?: string
}

/**
 * Form.Field.RadioGroup - Radio button group for single selection
 *
 * Renders a radio button group for mutually exclusive options.
 * Use Select for long lists, RadioGroup for short ones (2-5 options).
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.RadioGroup
 *   name="size"
 *   label="Size"
 *   options={[
 *     { label: 'Small', value: 'sm' },
 *     { label: 'Medium', value: 'md' },
 *     { label: 'Large', value: 'lg' },
 *   ]}
 * />
 * ```
 *
 * @example Horizontal layout
 * ```tsx
 * <Form.Field.RadioGroup
 *   name="priority"
 *   orientation="horizontal"
 *   options={[
 *     { label: 'Low', value: 'low' },
 *     { label: 'Medium', value: 'medium' },
 *     { label: 'High', value: 'high' },
 *   ]}
 * />
 * ```
 */
export const FieldRadioGroup = createField<RadioGroupFieldProps, string>({
  displayName: 'FieldRadioGroup',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <Field.Root
      invalid={hasError}
      required={resolved.required}
      disabled={resolved.disabled}
      readOnly={resolved.readOnly}
    >
      <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
      <RadioGroup.Root
        value={(field.state.value as string) ?? undefined}
        onValueChange={(details) => field.handleChange(details.value)}
        orientation={componentProps.orientation ?? 'vertical'}
        size={componentProps.size ?? 'md'}
        variant={componentProps.variant ?? 'solid'}
        colorPalette={componentProps.colorPalette ?? 'brand'}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        data-field-name={fullPath}
        display="flex"
        flexDirection={componentProps.orientation === 'horizontal' ? 'row' : 'column'}
        gap={componentProps.orientation === 'horizontal' ? 4 : 2}
        flexWrap="wrap"
      >
        {componentProps.options.map((opt) => (
          <RadioGroup.Item key={opt.value} value={opt.value} disabled={opt.disabled}>
            <RadioGroup.ItemHiddenInput onBlur={field.handleBlur} />
            <RadioGroup.ItemIndicator />
            <RadioGroup.ItemText>{getOptionLabel(opt)}</RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </Field.Root>
  ),
})
