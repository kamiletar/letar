'use client'

import { createListCollection, Field, Portal, Select } from '@chakra-ui/react'
import { type ReactElement, useMemo } from 'react'
import type { BaseFieldProps, BaseOption, FieldSize } from '../../types'
import { createField, FieldError, getOptionLabel, type ResolvedFieldProps, SelectionFieldLabel } from '../base'

/** Normalized option (value is always string for Chakra) */
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
  collection: ReturnType<typeof createListCollection<NormalizedOption>>
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
 */
export const FieldSelect = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (
    componentProps: Omit<SelectFieldProps, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps
  ): SelectFieldState => {
    // Options: props take priority, fallback to schema meta
    const sourceOptions = componentProps.options ?? resolved.options ?? []

    // Normalize options — value always string for Chakra
    const normalizedOptions: NormalizedOption[] = useMemo(
      () =>
        sourceOptions.map((opt) => ({
          label: opt.label,
          value: String(opt.value),
          disabled: opt.disabled,
        })),
      [sourceOptions]
    )

    // Create collection from normalized options
    const collection = useMemo(
      () =>
        createListCollection({
          items: normalizedOptions,
          itemToString: getOptionLabel,
          itemToValue: (item) => item.value,
        }),
      [normalizedOptions]
    )

    // Auto-determine clearable: show clear button if field is optional
    const resolvedClearable = componentProps.clearable ?? !resolved.required

    return { collection, normalizedOptions, resolvedClearable }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    // Convert current value to string for Chakra
    const currentValue = field.state.value
    const stringValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined

    return (
      <Field.Root invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <Select.Root
          collection={fieldState.collection}
          size={componentProps.size ?? 'md'}
          variant={componentProps.variant ?? 'outline'}
          value={stringValue ? [stringValue] : []}
          onValueChange={(details) => {
            const newStringValue = details.value[0] as string | undefined
            // Convert back to needed type
            if (componentProps.valueType === 'number') {
              field.handleChange(newStringValue ? Number(newStringValue) : 0)
            } else {
              field.handleChange(newStringValue ?? '')
            }
          }}
          onInteractOutside={() => field.handleBlur()}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        >
          <Select.HiddenSelect />
          {resolved.label && (
            <Select.Label>
              <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            </Select.Label>
          )}
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder={resolved.placeholder} />
            </Select.Trigger>
            <Select.IndicatorGroup>
              {fieldState.resolvedClearable && <Select.ClearTrigger />}
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {fieldState.normalizedOptions.map((opt) => (
                  <Select.Item item={opt} key={opt.value}>
                    {getOptionLabel(opt)}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
