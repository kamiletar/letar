'use client'

import { Field, Listbox } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps, FieldSizeWithoutXs, GroupableOption } from '../../types'
import {
  createField,
  FieldError,
  getOptionLabel,
  type GroupedOptionsResult,
  SelectionFieldLabel,
  useGroupedOptions,
} from '../base'

/**
 * Props for Listbox field
 */
export interface ListboxFieldProps<T = string> extends Omit<BaseFieldProps, 'placeholder'> {
  /** Options for listbox */
  options: GroupableOption<T>[]
  /**
   * Selection mode
   * - `single`: Single selection (by default)
   * - `multiple`: Multiple selection
   */
  selectionMode?: 'single' | 'multiple'
  /** Size */
  size?: FieldSizeWithoutXs
  /** Visual variant */
  variant?: 'subtle' | 'solid' | 'plain'
  /** Color palette */
  colorPalette?: string
  /** Element orientation (by default: vertical) */
  orientation?: 'horizontal' | 'vertical'
  /** Maximum height for scrolling */
  maxHeight?: string | number
}

/** State type for useFieldState */
type ListboxFieldState = GroupedOptionsResult

/**
 * Form.Field.Listbox - Selection list with visible options
 *
 * Unlike Select/Combobox which use dropdown, Listbox shows
 * all options directly in the form. Well suited for short lists (2-8 elements)
 * where all options should be visible.
 *
 * @example Single selection
 * ```tsx
 * <Form.Field.Listbox
 *   name="framework"
 *   label="Framework"
 *   options={[
 *     { label: 'React', value: 'react' },
 *     { label: 'Vue', value: 'vue' },
 *     { label: 'Angular', value: 'angular' },
 *   ]}
 * />
 * ```
 *
 * @example Multiple selection
 * ```tsx
 * <Form.Field.Listbox
 *   name="features"
 *   label="Features"
 *   selectionMode="multiple"
 *   options={[
 *     { label: 'TypeScript', value: 'ts' },
 *     { label: 'Testing', value: 'test' },
 *     { label: 'Linting', value: 'lint' },
 *   ]}
 * />
 * ```
 *
 * @example With groups
 * ```tsx
 * <Form.Field.Listbox
 *   name="language"
 *   options={[
 *     { label: 'TypeScript', value: 'ts', group: 'Frontend' },
 *     { label: 'Python', value: 'py', group: 'Backend' },
 *   ]}
 * />
 * ```
 */
export const FieldListbox = createField<ListboxFieldProps, string | string[], ListboxFieldState>({
  displayName: 'FieldListbox',
  useFieldState: (componentProps): ListboxFieldState => {
    // Use shared hook for grouping options
    return useGroupedOptions(componentProps.options)
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    // Handle single vs multiple values
    const currentValue = field.state.value as string | string[] | undefined
    const valueArray: string[] = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []
    const selectionMode = componentProps.selectionMode ?? 'single'

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <Listbox.Root
          collection={fieldState.collection}
          selectionMode={selectionMode}
          orientation={componentProps.orientation ?? 'vertical'}
          variant={componentProps.variant ?? 'subtle'}
          colorPalette={componentProps.colorPalette}
          value={valueArray}
          onValueChange={(details) => {
            if (selectionMode === 'single') {
              // Single mode: save single value or empty string
              const newValue = details.value[0] as string | undefined
              field.handleChange(newValue ?? '')
            } else {
              // Multiple mode: save array
              field.handleChange(details.value)
            }
          }}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        >
          {resolved.label && (
            <Listbox.Label fontSize={componentProps.size ?? 'md'}>
              <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            </Listbox.Label>
          )}

          <Listbox.Content maxH={componentProps.maxHeight}>
            {fieldState.groups
              ? /* Grouped options */
                Array.from(fieldState.groups.entries()).map(([groupName, groupOptions]) => (
                  <Listbox.ItemGroup key={groupName}>
                    {groupName && <Listbox.ItemGroupLabel>{groupName}</Listbox.ItemGroupLabel>}
                    {groupOptions.map((opt) => (
                      <Listbox.Item item={opt} key={opt.value}>
                        <Listbox.ItemText>{getOptionLabel(opt)}</Listbox.ItemText>
                        <Listbox.ItemIndicator />
                      </Listbox.Item>
                    ))}
                  </Listbox.ItemGroup>
                ))
              : /* Flat options */
                componentProps.options.map((opt) => (
                  <Listbox.Item item={opt} key={opt.value}>
                    <Listbox.ItemText>{getOptionLabel(opt)}</Listbox.ItemText>
                    <Listbox.ItemIndicator />
                  </Listbox.Item>
                ))}
          </Listbox.Content>
        </Listbox.Root>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
