'use client'

import { Field, SegmentGroup } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps, BaseOption, FieldSize } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Props for SegmentedGroup field
 */
export interface SegmentedGroupFieldProps<T = string> extends Omit<BaseFieldProps, 'placeholder'> {
  /** Options for segmented control */
  options: BaseOption<T>[]
  /** Size (by default: md) */
  size?: FieldSize
  /** Orientation (by default: horizontal) */
  orientation?: 'horizontal' | 'vertical'
  /** Color palette */
  colorPalette?: string
}

/**
 * Form.Field.SegmentedGroup - Segmented control for single selection
 *
 * Renders a segmented control for selecting one option from a set.
 * Similar to radio buttons but styled as connected segments.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.SegmentedGroup
 *   name="size"
 *   label="Size"
 *   options={[
 *     { label: 'S', value: 'sm' },
 *     { label: 'M', value: 'md' },
 *     { label: 'L', value: 'lg' },
 *   ]}
 * />
 * ```
 *
 * @example Different sizes
 * ```tsx
 * <Form.Field.SegmentedGroup
 *   name="billing"
 *   options={[
 *     { label: 'Monthly', value: 'monthly' },
 *     { label: 'Yearly', value: 'yearly' },
 *   ]}
 *   size="sm"
 * />
 * ```
 */
export const FieldSegmentedGroup = createField<SegmentedGroupFieldProps, string>({
  displayName: 'FieldSegmentedGroup',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <Field.Root
      invalid={hasError}
      required={resolved.required}
      disabled={resolved.disabled}
      readOnly={resolved.readOnly}
    >
      <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
      <SegmentGroup.Root
        value={(field.state.value as string) ?? ''}
        onValueChange={(details) => field.handleChange(details.value)}
        disabled={resolved.disabled}
        name={fullPath}
        size={componentProps.size ?? 'md'}
        orientation={componentProps.orientation ?? 'horizontal'}
        colorPalette={componentProps.colorPalette}
      >
        <SegmentGroup.Indicator />
        {componentProps.options.map((opt) => (
          <SegmentGroup.Item key={opt.value} value={opt.value} disabled={opt.disabled}>
            <SegmentGroup.ItemText>{opt.label}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        ))}
      </SegmentGroup.Root>
      <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </Field.Root>
  ),
})
