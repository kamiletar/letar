'use client'

import { Combobox, createListCollection, Field, Portal, Spinner, useFilter } from '@chakra-ui/react'
import { type ReactElement, useMemo } from 'react'
import type { BaseFieldProps, FieldSize } from '../../types'
import { type AsyncQueryFn, createField, FieldError, SelectionFieldLabel, useAsyncSearch } from '../base'

/**
 * Props for Form.Field.Autocomplete
 */
export interface AutocompleteFieldProps<TData = unknown> extends BaseFieldProps {
  /**
   * Static suggestions for autocomplete
   */
  suggestions?: string[]

  /**
   * Async function for loading suggestions
   * Should return { data, isLoading, error } similar to TanStack Query
   *
   * @example
   * ```tsx
   * useQuery={(search) => useFindManyCity({
   *   where: { name: { contains: search, mode: 'insensitive' } },
   *   take: 10,
   * })}
   * ```
   */
  useQuery?: AsyncQueryFn<TData>

  /**
   * Get label from data element
   * Required when using useQuery
   */
  getLabel?: (item: TData) => string

  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounce?: number

  /**
   * Minimum characters to trigger suggestions
   * @default 1
   */
  minChars?: number

  /**
   * Component size
   * @default 'md'
   */
  size?: FieldSize

  /**
   * Visual variant
   * @default 'outline'
   */
  variant?: 'outline' | 'subtle' | 'flushed'

  /**
   * Message for empty result
   * @default "No suggestions"
   */
  emptyMessage?: string

  /**
   * Message on loading
   * @default "Loading..."
   */
  loadingMessage?: string
}

/**
 * Suggestion element
 */
interface AutocompleteItem {
  label: string
  value: string
}

/** State type for useFieldState */
interface AutocompleteFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  isLoading: boolean
  suggestions: AutocompleteItem[]
  collection: ReturnType<typeof createListCollection<AutocompleteItem>>
}

/**
 * Form.Field.Autocomplete - Text input with suggestions
 *
 * Simplified version of Combobox that always allows custom values.
 * Ideal for city names, products or any free text input with suggestions.
 *
 * @example Static suggestions
 * ```tsx
 * <Form.Field.Autocomplete
 *   name="city"
 *   label="City"
 *   suggestions={['Moscow', 'Saint Petersburg', 'Kazan', 'Novosibirsk']}
 * />
 * ```
 *
 * @example Async suggestions with ZenStack
 * ```tsx
 * <Form.Field.Autocomplete
 *   name="product"
 *   label="Product"
 *   useQuery={(search) => useFindManyProduct({
 *     where: { name: { contains: search, mode: 'insensitive' } },
 *     take: 10,
 *   })}
 *   getLabel={(p) => p.name}
 *   debounce={300}
 *   minChars={2}
 * />
 * ```
 */
export const FieldAutocomplete = createField<AutocompleteFieldProps, string, AutocompleteFieldState>({
  displayName: 'FieldAutocomplete',
  useFieldState: (componentProps: Omit<AutocompleteFieldProps, keyof BaseFieldProps>): AutocompleteFieldState => {
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

    // Filter for static suggestions
    const { contains } = useFilter({ sensitivity: 'base' })

    // Build suggestions list
    const suggestions = useMemo((): AutocompleteItem[] => {
      if (componentProps.suggestions) {
        // Filtering static suggestions by input value
        const filtered = inputValue
          ? componentProps.suggestions.filter((s) => contains(s, inputValue))
          : componentProps.suggestions.slice(0, 10) // First 10 when input is empty
        return filtered.map((s) => ({ label: s, value: s }))
      }

      if (queryData && componentProps.getLabel) {
        const getLabel = componentProps.getLabel
        return (queryData as unknown[]).map((item) => {
          const itemLabel = getLabel(item)
          return { label: itemLabel, value: itemLabel }
        })
      }

      return []
    }, [componentProps.suggestions, queryData, componentProps.getLabel, inputValue, contains])

    // Create collection
    const collection = useMemo(() => {
      return createListCollection({
        items: suggestions,
        itemToString: (item) => item.label,
        itemToValue: (item) => item.value,
      })
    }, [suggestions])

    return {
      inputValue,
      setInputValue,
      isLoading,
      suggestions,
      collection,
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = (field.state.value as string) ?? ''
    const minChars = componentProps.minChars ?? 1

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <Combobox.Root
          collection={fieldState.collection}
          size={componentProps.size ?? 'md'}
          variant={componentProps.variant ?? 'outline'}
          value={currentValue ? [currentValue] : []}
          inputValue={fieldState.inputValue}
          onInputValueChange={(details) => {
            fieldState.setInputValue(details.inputValue)
            // Always update field value (allowCustomValue behavior)
            field.handleChange(details.inputValue)
          }}
          onValueChange={(details) => {
            const newValue = details.value[0] ?? ''
            fieldState.setInputValue(newValue)
            field.handleChange(newValue)
          }}
          onInteractOutside={() => field.handleBlur()}
          disabled={resolved.disabled}
          allowCustomValue
          openOnClick
          data-field-name={fullPath}
        >
          {resolved.label && (
            <Combobox.Label>
              <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            </Combobox.Label>
          )}

          <Combobox.Control>
            <Combobox.Input placeholder={resolved.placeholder ?? 'Start typing...'} />
            <Combobox.IndicatorGroup>
              {fieldState.isLoading && <Spinner size="xs" />}
              <Combobox.Trigger />
            </Combobox.IndicatorGroup>
          </Combobox.Control>

          <Portal>
            <Combobox.Positioner>
              <Combobox.Content>
                {/* Loading state */}
                {fieldState.isLoading && fieldState.suggestions.length === 0 && (
                  <Combobox.Empty>{componentProps.loadingMessage ?? 'Loading...'}</Combobox.Empty>
                )}

                {/* Empty result */}
                {!fieldState.isLoading &&
                  fieldState.suggestions.length === 0 &&
                  fieldState.inputValue.length >= minChars && (
                    <Combobox.Empty>{componentProps.emptyMessage ?? 'No suggestions'}</Combobox.Empty>
                  )}

                {/* Hint about minimum characters */}
                {!fieldState.isLoading &&
                  fieldState.suggestions.length === 0 &&
                  fieldState.inputValue.length < minChars &&
                  fieldState.inputValue.length > 0 && (
                    <Combobox.Empty>Enter at least {minChars} characters</Combobox.Empty>
                  )}

                {/* Suggestions */}
                {fieldState.suggestions.map((item) => (
                  <Combobox.Item item={item} key={item.value}>
                    <Combobox.ItemText>{item.label}</Combobox.ItemText>
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
