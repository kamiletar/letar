'use client'

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import type { BaseFieldProps, BaseOption, FieldSize } from '../../types'
import { chakraUIKit, createField, getOptionLabel, type ResolvedFieldProps, SelectionFieldLabel } from '../base'

/** Normalized option (value is always string for the UIKit Select contract) */
interface NormalizedOption {
  label: React.ReactNode
  value: string
  disabled?: boolean
}

/**
 * Props for Select field
 */
export interface SelectFieldProps extends BaseFieldProps {
  /** Options for selection (string or number values). If not specified, taken from schema meta */
  options?: BaseOption<string | number>[]
  /** Value type: 'string' (by default) or 'number' */
  valueType?: 'string' | 'number'
  /** Show clear button (auto-determined: true if optional, false if required) */
  clearable?: boolean
  /** Size */
  size?: FieldSize
  /** Visual variant */
  variant?: 'outline' | 'subtle'
}

/** State type for useFieldState */
interface SelectFieldState {
  normalizedOptions: NormalizedOption[]
  resolvedClearable: boolean
}

/**
 * Form.Field.Select - Styled Chakra Select dropdown
 *
 * Styled select component with customizable appearance,
 * animations and advanced features (search, clear, custom rendering).
 *
 * For simple cases or better mobile UX use Form.Field.NativeSelect.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Select
 *   name="framework"
 *   label="Framework"
 *   options={[
 *     { label: 'React', value: 'react' },
 *     { label: 'Vue', value: 'vue' },
 *     { label: 'Angular', value: 'angular', disabled: true },
 *   ]}
 *   clearable
 * />
 * ```
 *
 * Uses the `UIKit` contract (`@letar/forms-core/uikit`) instead of importing Chakra directly —
 * Фаза 7.1, Этап 4 proof that the seam covers a selection field with an options list and
 * a portal-rendered dropdown, the most structurally different of the three proof fields.
 */
export const FieldSelect = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (
    componentProps: Omit<SelectFieldProps, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps,
  ): SelectFieldState => {
    // Options: props take priority, fallback to schema meta
    const sourceOptions = componentProps.options ?? resolved.options ?? []

    // Normalize options — value always string for the UIKit contract
    const normalizedOptions: NormalizedOption[] = useMemo(
      () =>
        sourceOptions.map((opt) => ({
          label: opt.label,
          value: String(opt.value),
          disabled: opt.disabled,
        })),
      [sourceOptions],
    )

    // Auto-determine clearable: show clear button if field is optional
    const resolvedClearable = componentProps.clearable ?? !resolved.required

    return { normalizedOptions, resolvedClearable }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    // Convert current value to string for the UIKit contract
    const currentValue = field.state.value
    const stringValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined

    return (
      <chakraUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <chakraUIKit.Select
          value={stringValue}
          onValueChange={(newStringValue) => {
            // Convert back to needed type
            if (componentProps.valueType === 'number') {
              field.handleChange(newStringValue ? Number(newStringValue) : 0)
            } else {
              field.handleChange(newStringValue ?? '')
            }
          }}
          onBlur={field.handleBlur}
          options={fieldState.normalizedOptions.map((opt) => ({
            value: opt.value,
            label: getOptionLabel(opt),
            disabled: opt.disabled,
          }))}
          label={resolved.label
            ? <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            : undefined}
          placeholder={resolved.placeholder}
          disabled={resolved.disabled}
          clearable={fieldState.resolvedClearable}
          size={componentProps.size ?? 'md'}
          variant={componentProps.variant ?? 'outline'}
          data-field-name={fullPath}
        />
        <chakraUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </chakraUIKit.FieldRoot>
    )
  },
})
