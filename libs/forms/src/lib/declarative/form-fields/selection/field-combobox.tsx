'use client'

import { Combobox, Field, Portal, Spinner, useFilter } from '@chakra-ui/react'
import { type ReactElement, type ReactNode, useMemo } from 'react'
import type { BaseFieldProps, FieldSize, GroupableOption } from '../../types'
import {
  type AsyncQueryFn,
  createField,
  FieldError,
  getOptionLabel,
  type GroupedOptionsResult,
  type ResolvedFieldProps,
  SelectionFieldLabel,
  useAsyncSearch,
  useGroupedOptions,
} from '../base'

/**
 * Props for Form.Field.Combobox
 */
export interface ComboboxFieldProps<T = string, TData = unknown> extends BaseFieldProps {
  /**
   * Static options (mutually exclusive with useQuery)
   */
  options?: GroupableOption<T>[]

  /**
   * Async function for loading options
   * Should return { data, isLoading, error } similar to TanStack Query
   *
   * @example
   * ```tsx
   * useQuery={(search) => useFindManyUser({
   *   where: { name: { contains: search, mode: 'insensitive' } },
   *   take: 20,
   * })}
   * ```
   */
  useQuery?: AsyncQueryFn<TData>

  /**
   * Get label from data element
   * Required when using useQuery
   */
  getLabel?: (item: TData) => ReactNode

  /**
   * Get value from data element
   * Required when using useQuery
   */
  getValue?: (item: TData) => T

  /**
   * Get group key from data element
   * Optional, for grouping results
   */
  getGroup?: (item: TData) => string | undefined

  /**
   * Check if element is disabled
   */
  getDisabled?: (item: TData) => boolean

  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounce?: number

  /**
   * Minimum characters to trigger search
   * @default 1
   */
  minChars?: number

  /**
   * Show clear button
   * Auto-determined from schema if not specified
   */
  clearable?: boolean

  /**
   * Allow custom values not from the list
   * @default false
   */
  allowCustomValue?: boolean

  /**
   * Component size
   */
  size?: FieldSize

  /**
   * Visual variant
   */
  variant?: 'outline' | 'subtle' | 'flushed'

  /**
   * Message for empty result
   * @default "Nothing found"
   */
  emptyMessage?: string

  /**
   * Message on loading
   * @default "Loading..."
   */
  loadingMessage?: string
}

/** State type for useFieldState */
interface ComboboxFieldState extends GroupedOptionsResult {
  inputValue: string
  setInputValue: (value: string) => void
  isLoading: boolean
  options: GroupableOption[]
  resolvedClearable: boolean
}

/**
 * Form.Field.Combobox - Async search select with debounce and grouping
 *
 * Supports both static options and async loading via TanStack Query hooks.
 *
 * @example Static options
 * ```tsx
 * <Form.Field.Combobox
 *   name="framework"
 *   label="Framework"
 *   options={[
 *     { label: 'React', value: 'react' },
 *     { label: 'Vue', value: 'vue', group: 'Frontend' },
 *   ]}
 * />
 * ```
 *
 * @example Async with ZenStack hooks
 * ```tsx
 * <Form.Field.Combobox
 *   name="userId"
 *   label="User"
 *   useQuery={(search) => useFindManyUser({
 *     where: { name: { contains: search, mode: 'insensitive' } },
 *     take: 20,
 *   })}
 *   getLabel={(user) => user.name}
 *   getValue={(user) => user.id}
 *   getGroup={(user) => user.role}
 *   debounce={300}
 *   minChars={2}
 * />
 * ```
 */
export const FieldCombobox = createField<ComboboxFieldProps, string, ComboboxFieldState>({
  displayName: 'FieldCombobox',
  useFieldState: (
    componentProps: Omit<ComboboxFieldProps, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps
  ): ComboboxFieldState => {
    // Async search with debounce via shared hook
    const {
      inputValue,
      setInputValue,
      isLoading,
      data: queryData,
    } = useAsyncSearch({
      useQuery: componentProps.useQuery,
      debounce: componentProps.debounce ?? 300,
      minChars: componentProps.minChars ?? 1,
    })

    // Filter for static options
    const { contains } = useFilter({ sensitivity: 'base' })

    // Build options from static or async source
    const options = useMemo((): GroupableOption[] => {
      if (componentProps.options) {
        // Filtering static options by input value
        if (!inputValue) {
          return componentProps.options
        }
        return componentProps.options.filter((opt) => {
          return contains(getOptionLabel(opt), inputValue)
        })
      }

      if (queryData && componentProps.getLabel && componentProps.getValue) {
        const getLabel = componentProps.getLabel
        const getValue = componentProps.getValue
        return (queryData as unknown[]).map((item) => ({
          label: getLabel(item),
          value: getValue(item),
          group: componentProps.getGroup?.(item),
          disabled: componentProps.getDisabled?.(item),
        }))
      }

      return []
    }, [
      componentProps.options,
      queryData,
      componentProps.getLabel,
      componentProps.getValue,
      componentProps.getGroup,
      componentProps.getDisabled,
      inputValue,
      contains,
    ])

    // Create collection with grouping via shared hook
    const { collection, groups } = useGroupedOptions(options)

    // Auto-determine clearable
    const resolvedClearable = componentProps.clearable ?? !resolved.required

    return {
      inputValue,
      setInputValue,
      isLoading,
      options,
      collection,
      groups,
      resolvedClearable,
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = field.state.value as string | undefined
    const minChars = componentProps.minChars ?? 1

    return (
      <Field.Root invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <Combobox.Root
          collection={fieldState.collection}
          size={componentProps.size ?? 'md'}
          variant={componentProps.variant ?? 'outline'}
          value={currentValue ? [currentValue] : []}
          inputValue={fieldState.inputValue}
          onInputValueChange={(details) => fieldState.setInputValue(details.inputValue)}
          onValueChange={(details) => {
            const newValue = details.value[0] as string | undefined
            field.handleChange(newValue ?? '')
          }}
          onInteractOutside={() => field.handleBlur()}
          disabled={resolved.disabled}
          allowCustomValue={componentProps.allowCustomValue ?? false}
          openOnClick
          data-field-name={fullPath}
        >
          {resolved.label && (
            <Combobox.Label>
              <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            </Combobox.Label>
          )}

          <Combobox.Control>
            <Combobox.Input placeholder={resolved.placeholder ?? 'Search...'} />
            <Combobox.IndicatorGroup>
              {fieldState.isLoading && <Spinner size="xs" />}
              {fieldState.resolvedClearable && <Combobox.ClearTrigger />}
              <Combobox.Trigger />
            </Combobox.IndicatorGroup>
          </Combobox.Control>

          <Portal>
            <Combobox.Positioner>
              <Combobox.Content>
                {/* Loading state */}
                {fieldState.isLoading && fieldState.options.length === 0 && (
                  <Combobox.Empty>{componentProps.loadingMessage ?? 'Loading...'}</Combobox.Empty>
                )}

                {/* Empty result */}
                {!fieldState.isLoading &&
                  fieldState.options.length === 0 &&
                  fieldState.inputValue.length >= minChars && (
                    <Combobox.Empty>{componentProps.emptyMessage ?? 'Nothing found'}</Combobox.Empty>
                  )}

                {/* Hint about minimum characters */}
                {!fieldState.isLoading &&
                  fieldState.options.length === 0 &&
                  fieldState.inputValue.length < minChars &&
                  fieldState.inputValue.length > 0 && (
                    <Combobox.Empty>Enter at least {minChars} characters</Combobox.Empty>
                  )}

                {/* Grouped options */}
                {fieldState.groups
                  ? Array.from(fieldState.groups.entries()).map(([groupName, groupOptions]) => (
                      <Combobox.ItemGroup key={groupName}>
                        {groupName && <Combobox.ItemGroupLabel>{groupName}</Combobox.ItemGroupLabel>}
                        {groupOptions.map((opt) => (
                          <Combobox.Item item={opt} key={opt.value}>
                            <Combobox.ItemText>{getOptionLabel(opt)}</Combobox.ItemText>
                            <Combobox.ItemIndicator />
                          </Combobox.Item>
                        ))}
                      </Combobox.ItemGroup>
                    ))
                  : /* Flat options */
                    fieldState.options.map((opt) => (
                      <Combobox.Item item={opt} key={opt.value}>
                        <Combobox.ItemText>{getOptionLabel(opt)}</Combobox.ItemText>
                        <Combobox.ItemIndicator />
                      </Combobox.Item>
                    ))}
              </Combobox.Content>
            </Combobox.Positioner>
          </Portal>
        </Combobox.Root>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
