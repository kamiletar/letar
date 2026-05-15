'use client'

import { createListCollection, Field, Portal, Select, Spinner } from '@chakra-ui/react'
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { useFormGroup } from '../../../form-group'
import { useDeclarativeForm } from '../../form-context'
import type { BaseFieldProps, BaseOption, FieldSize } from '../../types'
import { FieldError, getFieldErrors, getOptionLabel, type ResolvedFieldProps, SelectionFieldLabel } from '../base'
import { useResolvedFieldProps } from '../base/use-resolved-field-props'

/**
 * Options loading result
 */
export interface CascadingSelectLoadResult<T = string> {
  /** Loaded options */
  options: BaseOption<T>[]
}

/**
 * Props for CascadingSelect field
 */
export interface CascadingSelectFieldProps<TParent = string, TValue = string> extends BaseFieldProps {
  /**
   * Parent field name that this select depends on
   * @example "country" - load cities on country change
   */
  dependsOn: string
  /**
   * Function to load options when parent field changes
   * @param parentValue - Current value of the parent field
   * @returns Promise with options array or object with options
   */
  loadOptions: (
    parentValue: TParent | undefined
  ) => Promise<BaseOption<TValue>[]> | Promise<CascadingSelectLoadResult<TValue>>
  /**
   * Initial options (shown before parent value is selected)
   * @default []
   */
  initialOptions?: BaseOption<TValue>[]
  /**
   * Automatically clear value when parent changes
   * @default true
   */
  clearOnParentChange?: boolean
  /**
   * Disable field while parent is empty
   * @default true
   */
  disableWhenParentEmpty?: boolean
  /**
   * Show clear button (auto-determined: true if optional, false if required)
   */
  clearable?: boolean
  /**
   * Component size
   */
  size?: FieldSize
  /**
   * Visual variant
   */
  variant?: 'outline' | 'subtle'
  /**
   * Placeholder when parent value is empty
   */
  placeholderWhenDisabled?: string
}

/**
 * Internal component for rendering Select with loaded options
 */
interface CascadingSelectContentProps<TParent, TValue> {
  parentValue: TParent | undefined
  form: ReturnType<typeof useDeclarativeForm>['form']
  fullPath: string
  resolved: ResolvedFieldProps
  loadOptions: CascadingSelectFieldProps<TParent, TValue>['loadOptions']
  initialOptions: BaseOption<TValue>[]
  clearOnParentChange: boolean
  disableWhenParentEmpty: boolean
  clearable?: boolean
  size: FieldSize
  variant: 'outline' | 'subtle'
  placeholderWhenDisabled?: string
}

function CascadingSelectContent<TParent = string, TValue = string>({
  parentValue,
  form,
  fullPath,
  resolved,
  loadOptions,
  initialOptions,
  clearOnParentChange,
  disableWhenParentEmpty,
  clearable,
  size,
  variant,
  placeholderWhenDisabled,
}: CascadingSelectContentProps<TParent, TValue>): ReactElement {
  // Options state and loading
  const [options, setOptions] = useState<BaseOption<TValue>[]>(initialOptions)
  const [isLoading, setIsLoading] = useState(false)

  // Ref for tracking previous parent value
  const prevParentValueRef = useRef<TParent | undefined>(parentValue)

  // Ref for stable loadOptions reference (avoid infinite loops with inline functions)
  const loadOptionsRef = useRef(loadOptions)
  loadOptionsRef.current = loadOptions

  // Effect for loading options when parentValue changes
  useEffect(() => {
    // Loading function
    const doLoad = async () => {
      if (parentValue === undefined || parentValue === null || parentValue === '') {
        setOptions(initialOptions)
        return
      }

      setIsLoading(true)
      try {
        const result = await loadOptionsRef.current(parentValue)
        // Support both formats: array or object with options
        const newOptions = Array.isArray(result) ? result : result.options
        setOptions(newOptions)
      } catch (error) {
        console.error('Error loading cascading select options:', error)
        setOptions([])
      } finally {
        setIsLoading(false)
      }
    }

    void doLoad()
  }, [parentValue, initialOptions])

  // Effect for clearing value when parent changes
  useEffect(() => {
    if (clearOnParentChange && prevParentValueRef.current !== parentValue) {
      // Clear field value if parent changed (not on first render)
      if (prevParentValueRef.current !== undefined) {
        form.setFieldValue(fullPath, '' as unknown)
      }
      prevParentValueRef.current = parentValue
    }
  }, [parentValue, clearOnParentChange, form, fullPath])

  // Determine if the field should be disabled
  const isParentEmpty = parentValue === undefined || parentValue === null || parentValue === ''
  const isDisabled = resolved.disabled || (disableWhenParentEmpty && isParentEmpty)

  // Determine placeholder
  const effectivePlaceholder = isParentEmpty && placeholderWhenDisabled ? placeholderWhenDisabled : resolved.placeholder

  // Auto-determine clearable
  const resolvedClearable = clearable ?? !resolved.required

  // Create collection from options
  const collection = useMemo(
    () =>
      createListCollection({
        items: options,
        itemToString: getOptionLabel,
        itemToValue: (item) => item.value as string,
      }),
    [options]
  )

  return (
    <form.Field name={fullPath}>
      {(field: {
        state: { value: unknown; meta: { errors?: unknown[] } }
        handleChange: (v: unknown) => void
        handleBlur: () => void
      }) => {
        const { hasError, errorMessage } = getFieldErrors(field)
        const currentValue = field.state.value as string | undefined

        return (
          <Field.Root invalid={hasError} required={resolved.required} disabled={isDisabled}>
            <Select.Root
              collection={collection}
              size={size}
              variant={variant}
              value={currentValue ? [currentValue] : []}
              onValueChange={(details) => {
                const newValue = details.value[0] as string | undefined
                field.handleChange(newValue ?? '')
              }}
              onInteractOutside={() => field.handleBlur()}
              disabled={isDisabled}
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
                  <Select.ValueText placeholder={effectivePlaceholder} />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  {isLoading && <Spinner size="xs" />}
                  {resolvedClearable && !isLoading && <Select.ClearTrigger />}
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {options.map((opt) => (
                      <Select.Item item={opt} key={opt.value as string}>
                        {getOptionLabel(opt)}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
            <FieldError hasError={!!hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

/**
 * Form.Field.CascadingSelect - Cascading select depending on another field
 *
 * Loads options dynamically based on another field's value.
 * Useful for linked lists like Country -> City, Category -> Subcategory.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Select
 *   name="country"
 *   label="Country"
 *   options={countries}
 * />
 * <Form.Field.CascadingSelect
 *   name="city"
 *   label="City"
 *   dependsOn="country"
 *   loadOptions={async (countryCode) => {
 *     if (!countryCode) return []
 *     const cities = await fetchCities(countryCode)
 *     return cities.map(c => ({ label: c.name, value: c.id }))
 *   }}
 *   placeholderWhenDisabled="Select country first"
 * />
 * ```
 *
 * @example Nested fields
 * ```tsx
 * <Form.Field.CascadingSelect
 *   name="address.region"
 *   label="Region"
 *   dependsOn="address.country"
 *   loadOptions={loadRegions}
 * />
 * ```
 */
export function FieldCascadingSelect<TParent = string, TValue = string>(
  props: CascadingSelectFieldProps<TParent, TValue>
): ReactElement {
  const {
    name,
    dependsOn,
    loadOptions,
    initialOptions = [],
    clearOnParentChange = true,
    disableWhenParentEmpty = true,
    clearable,
    size = 'md',
    variant = 'outline',
    placeholderWhenDisabled,
    ...baseProps
  } = props

  const { form } = useDeclarativeForm()
  const parentGroup = useFormGroup()
  const { form: _formFromProps, fullPath, ...resolvedRest } = useResolvedFieldProps(name, baseProps)

  const resolved: ResolvedFieldProps = {
    label: resolvedRest.label,
    placeholder: resolvedRest.placeholder,
    helperText: resolvedRest.helperText,
    tooltip: resolvedRest.tooltip,
    required: resolvedRest.required,
    disabled: resolvedRest.disabled,
    readOnly: resolvedRest.readOnly,
    constraints: resolvedRest.constraints,
    options: resolvedRest.options,
    autocomplete: resolvedRest.autocomplete,
  }

  // Build full path to parent field
  const fullDependsOnPath = parentGroup ? `${parentGroup.name}.${dependsOn}` : dependsOn

  // Create selector for parent field value (inline, like in FormWhen)
  const parentSelector = (state: { values: Record<string, unknown> }): TParent | undefined => {
    const parts = fullDependsOnPath.split('.')
    let value: unknown = state.values
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        value = undefined
        break
      }
    }
    return value as TParent | undefined
  }

  // Use form.Subscribe to subscribe to parent field changes
  return (
    <form.Subscribe selector={parentSelector}>
      {(parentValue: TParent | undefined) => (
        <CascadingSelectContent
          parentValue={parentValue}
          form={form}
          fullPath={fullPath}
          resolved={resolved}
          loadOptions={loadOptions}
          initialOptions={initialOptions as BaseOption<TValue>[]}
          clearOnParentChange={clearOnParentChange}
          disableWhenParentEmpty={disableWhenParentEmpty}
          clearable={clearable}
          size={size}
          variant={variant}
          placeholderWhenDisabled={placeholderWhenDisabled}
        />
      )}
    </form.Subscribe>
  )
}

FieldCascadingSelect.displayName = 'FieldCascadingSelect'
