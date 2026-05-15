'use client'

import type { ReactElement, ReactNode } from 'react'
import type { ZodConstraints } from './schema-constraints'
import type { SchemaFieldInfo } from './schema-traversal'
import type { FieldComponentType } from './types/meta-types'

// Import all Field components
import { FieldEditable } from './form-fields/text/field-editable'
import { FieldPassword } from './form-fields/text/field-password'
import { FieldPasswordStrength } from './form-fields/text/field-password-strength'
import { FieldRichText } from './form-fields/text/field-rich-text'
import { FieldString } from './form-fields/text/field-string'
import { FieldTextarea } from './form-fields/text/field-textarea'

import { FieldCurrency } from './form-fields/number/field-currency'
import { FieldNumber } from './form-fields/number/field-number'
import { FieldNumberInput } from './form-fields/number/field-number-input'
import { FieldPercentage } from './form-fields/number/field-percentage'
import { FieldRating } from './form-fields/number/field-rating'
import { FieldSlider } from './form-fields/number/field-slider'

import { FieldDate } from './form-fields/datetime/field-date'
import { FieldDateRange } from './form-fields/datetime/field-date-range'
import { FieldDateTimePicker } from './form-fields/datetime/field-datetime-picker'
import { FieldDuration } from './form-fields/datetime/field-duration'
import { FieldSchedule } from './form-fields/datetime/field-schedule'
import { FieldTime } from './form-fields/datetime/field-time'

import { FieldCheckbox } from './form-fields/boolean/field-checkbox'
import { FieldSwitch } from './form-fields/boolean/field-switch'

import { FieldAutocomplete } from './form-fields/selection/field-autocomplete'
import { FieldCheckboxCard } from './form-fields/selection/field-checkbox-card'
import { FieldCombobox } from './form-fields/selection/field-combobox'
import { FieldListbox } from './form-fields/selection/field-listbox'
import { FieldNativeSelect } from './form-fields/selection/field-native-select'
import { FieldRadioCard } from './form-fields/selection/field-radio-card'
import { FieldRadioGroup } from './form-fields/selection/field-radio-group'
import { FieldSegmentedGroup } from './form-fields/selection/field-segmented-group'
import { FieldSelect } from './form-fields/selection/field-select'
import { FieldTags } from './form-fields/selection/field-tags'

import { FieldAddress } from './form-fields/specialized/field-address'
import { FieldColorPicker } from './form-fields/specialized/field-color-picker'
import { FieldFileUpload } from './form-fields/specialized/field-file-upload'
import { FieldOTPInput } from './form-fields/specialized/field-otp-input'
import { FieldPhone } from './form-fields/specialized/field-phone'
import { FieldPinInput } from './form-fields/specialized/field-pin-input'
import { FieldMaskedInput } from './form-fields/text/field-masked-input'

import { camelCaseToLabel } from './form-fields/auto/field-auto'
import { type RelationOption, useRelationFieldContext } from './relation-field-provider'

/**
 * Relation configuration in fieldProps
 */
export interface RelationFieldConfig {
  /** Model name (must match model in RelationFieldProvider) */
  model: string
  /** Field to display as label */
  labelField: string
  /** Field for value (default 'id') */
  valueField?: string
}

/**
 * Props for field rendering
 */
export interface FieldRenderProps {
  /** Field name */
  name: string
  /** Label (if not specified, generated from name) */
  label?: ReactNode
  /** Placeholder */
  placeholder?: string
  /** Helper text */
  helperText?: ReactNode
  /** Required field */
  required?: boolean
  /** Disabled */
  disabled?: boolean
  /** Read only */
  readOnly?: boolean
  /** Enum values for select/radio */
  enumValues?: string[]
  /** Constraints from schema */
  constraints?: ZodConstraints
  /** Additional props from fieldProps */
  fieldProps?: Record<string, unknown>
  /**
   * Options from RelationFieldProvider (if field has relation config)
   * Set automatically via SchemaFieldWithRelations
   */
  relationOptions?: RelationOption[]
}

/**
 * Determine component type based on:
 * 1. Explicit fieldType from meta (priority)
 * 2. Zod type (fallback)
 */
export function resolveFieldType(field: SchemaFieldInfo): FieldComponentType {
  // Priority: explicit fieldType from meta
  if (field.ui?.fieldType) {
    return field.ui.fieldType
  }

  // Fallback to Zod type
  switch (field.zodType) {
    case 'string':
      // Check email/url via constraints
      if (field.constraints?.string?.inputType === 'email') {
        return 'string'
      }
      if (field.constraints?.string?.inputType === 'url') {
        return 'string'
      }
      // Check long string -> textarea
      if (field.constraints?.string?.maxLength && field.constraints.string.maxLength > 200) {
        return 'textarea'
      }
      return 'string'

    case 'number':
    case 'bigint':
    case 'int':
    case 'float':
      return 'number'

    case 'boolean':
      return 'checkbox'

    case 'date':
      return 'date'

    case 'enum':
    case 'literal':
      return 'nativeSelect'

    case 'array':
      // Primitive arrays -> tags
      if (field.element?.zodType === 'string') {
        return 'tags'
      }
      // Object arrays are handled separately
      return 'string' // fallback

    default:
      return 'string'
  }
}

/**
 * Option type for selection components
 */
interface SelectOptionResolved {
  value: string
  label: string
  description?: string
}

/**
 * Option type for NativeSelect (uses title instead of label)
 */
interface NativeSelectOptionResolved {
  value: string
  title: string
  description?: string
}

/**
 * Get options for a selection field considering relationOptions
 * Priority: fieldProps.options > relationOptions > enumValues
 */
function resolveSelectOptions(
  fieldProps: Record<string, unknown>,
  relationOptions?: RelationOption[],
  enumValues?: string[]
): SelectOptionResolved[] | undefined {
  // 1. Explicit options in fieldProps (highest priority)
  if (fieldProps.options && Array.isArray(fieldProps.options)) {
    return fieldProps.options as SelectOptionResolved[]
  }

  // 2. Options from RelationFieldProvider
  if (relationOptions && relationOptions.length > 0) {
    return relationOptions.map((opt) => ({
      value: opt.value,
      label: opt.label,
      description: opt.description,
    }))
  }

  // 3. Enum values (fallback)
  if (enumValues && enumValues.length > 0) {
    return enumValues.map((v) => ({ label: camelCaseToLabel(v), value: v }))
  }

  return undefined
}

/**
 * Get options for NativeSelect (uses title instead of label)
 */
function resolveNativeSelectOptions(
  fieldProps: Record<string, unknown>,
  relationOptions?: RelationOption[],
  enumValues?: string[]
): NativeSelectOptionResolved[] | undefined {
  // 1. Explicit options in fieldProps (highest priority)
  if (fieldProps.options && Array.isArray(fieldProps.options)) {
    return fieldProps.options as NativeSelectOptionResolved[]
  }

  // 2. Options from RelationFieldProvider
  if (relationOptions && relationOptions.length > 0) {
    return relationOptions.map((opt) => ({
      value: opt.value,
      title: opt.label,
      description: opt.description,
    }))
  }

  // 3. Enum values (fallback)
  if (enumValues && enumValues.length > 0) {
    return enumValues.map((v) => ({ title: camelCaseToLabel(v), value: v }))
  }

  return undefined
}

/**
 * Render a field component by type
 */
export function renderFieldByType(type: FieldComponentType, props: FieldRenderProps): ReactElement {
  const {
    name,
    label: labelProp,
    placeholder,
    helperText,
    required,
    disabled,
    readOnly,
    enumValues,
    constraints,
    fieldProps = {},
    relationOptions,
  } = props

  // Generate label if not specified
  const label = labelProp ?? camelCaseToLabel(name)

  // Base props for all fields
  const baseProps = {
    name,
    label,
    placeholder,
    helperText,
    required,
    disabled,
    readOnly,
  }

  // Apply constraints to props
  const stringConstraints = constraints?.string || {}
  const numberConstraints = constraints?.number || {}

  // Pre-compute options for selection fields
  const selectOptions = resolveSelectOptions(fieldProps, relationOptions, enumValues)
  const nativeSelectOptions = resolveNativeSelectOptions(fieldProps, relationOptions, enumValues)

  switch (type) {
    // Text fields
    case 'string':
      return (
        <FieldString
          key={name}
          {...baseProps}
          type={stringConstraints.inputType}
          maxLength={stringConstraints.maxLength}
          minLength={stringConstraints.minLength}
          pattern={stringConstraints.pattern}
          {...fieldProps}
        />
      )
    case 'textarea':
      return <FieldTextarea key={name} {...baseProps} maxLength={stringConstraints.maxLength} {...fieldProps} />
    case 'password':
      return <FieldPassword key={name} {...baseProps} {...fieldProps} />
    case 'passwordStrength':
      return <FieldPasswordStrength key={name} {...baseProps} {...fieldProps} />
    case 'editable':
      return <FieldEditable key={name} {...baseProps} {...fieldProps} />
    case 'richText':
      return <FieldRichText key={name} {...baseProps} {...fieldProps} />

    // Number fields
    case 'number':
      return (
        <FieldNumber
          key={name}
          {...baseProps}
          min={numberConstraints.min}
          max={numberConstraints.max}
          step={numberConstraints.step}
          {...fieldProps}
        />
      )
    case 'numberInput':
      return (
        <FieldNumberInput
          key={name}
          {...baseProps}
          min={numberConstraints.min}
          max={numberConstraints.max}
          step={numberConstraints.step}
          {...fieldProps}
        />
      )
    case 'slider':
      return (
        <FieldSlider
          key={name}
          {...baseProps}
          min={numberConstraints.min}
          max={numberConstraints.max}
          step={numberConstraints.step}
          {...fieldProps}
        />
      )
    case 'rating':
      return <FieldRating key={name} {...baseProps} {...fieldProps} />
    case 'currency':
      return <FieldCurrency key={name} {...baseProps} {...fieldProps} />
    case 'percentage':
      return <FieldPercentage key={name} {...baseProps} {...fieldProps} />

    // Date and time
    case 'date':
      return (
        <FieldDate
          key={name}
          {...baseProps}
          min={constraints?.date?.min}
          max={constraints?.date?.max}
          {...fieldProps}
        />
      )
    case 'time':
      return <FieldTime key={name} {...baseProps} {...fieldProps} />
    case 'dateRange':
      return <FieldDateRange key={name} {...baseProps} {...fieldProps} />
    case 'dateTimePicker':
      return <FieldDateTimePicker key={name} {...baseProps} {...fieldProps} />
    case 'duration':
      return <FieldDuration key={name} {...baseProps} {...fieldProps} />
    case 'schedule':
      return <FieldSchedule key={name} {...baseProps} {...fieldProps} />

    // Boolean fields
    case 'checkbox':
      return <FieldCheckbox key={name} {...baseProps} {...fieldProps} />
    case 'switch':
      return <FieldSwitch key={name} {...baseProps} {...fieldProps} />

    // Selection from list
    // Options resolved with priority: fieldProps.options > relationOptions > enumValues
    case 'select':
      return <FieldSelect key={name} {...baseProps} options={selectOptions ?? []} {...fieldProps} />
    case 'nativeSelect':
      return <FieldNativeSelect key={name} {...baseProps} options={nativeSelectOptions ?? []} {...fieldProps} />
    case 'combobox':
      return <FieldCombobox key={name} {...baseProps} {...fieldProps} />
    case 'autocomplete':
      return <FieldAutocomplete key={name} {...baseProps} {...fieldProps} />
    case 'listbox':
      return <FieldListbox key={name} {...baseProps} options={selectOptions ?? []} {...fieldProps} />
    case 'radioGroup':
      return <FieldRadioGroup key={name} {...baseProps} options={selectOptions ?? []} {...fieldProps} />
    case 'radioCard':
      return <FieldRadioCard key={name} {...baseProps} options={selectOptions ?? []} {...fieldProps} />
    case 'segmentedGroup':
      return <FieldSegmentedGroup key={name} {...baseProps} options={selectOptions ?? []} {...fieldProps} />
    case 'checkboxCard':
      return <FieldCheckboxCard key={name} {...baseProps} options={selectOptions ?? []} {...fieldProps} />
    case 'tags':
      return <FieldTags key={name} {...baseProps} {...fieldProps} />

    // Specialized fields
    case 'phone':
      return <FieldPhone key={name} {...baseProps} {...fieldProps} />
    case 'address': {
      // FieldAddress requires token from fieldProps
      const token = fieldProps.token as string | undefined
      if (!token) {
        console.warn(`Form.Field.Address "${name}" requires token in fieldProps`)
      }
      return <FieldAddress key={name} {...baseProps} token={token ?? ''} {...fieldProps} />
    }
    case 'pinInput':
      return <FieldPinInput key={name} {...baseProps} {...fieldProps} />
    case 'otpInput':
      return <FieldOTPInput key={name} {...baseProps} {...fieldProps} />
    case 'colorPicker':
      return <FieldColorPicker key={name} {...baseProps} {...fieldProps} />
    case 'fileUpload': {
      // FieldFileUpload requires label and helperText as string
      const labelStr = typeof label === 'string' ? label : String(label ?? '')
      const helperStr = typeof helperText === 'string' ? helperText : undefined
      return (
        <FieldFileUpload
          key={name}
          {...baseProps}
          label={labelStr || undefined}
          helperText={helperStr}
          {...fieldProps}
        />
      )
    }
    case 'maskedInput':
      return <FieldMaskedInput key={name} {...baseProps} {...fieldProps} />

    default:
      // Fallback to string
      return <FieldString key={name} {...baseProps} {...fieldProps} />
  }
}

/**
 * Render a field from SchemaFieldInfo
 * @param field - field information from schema
 * @param relationOptions - options from RelationFieldProvider (if available)
 */
export function renderSchemaField(field: SchemaFieldInfo, relationOptions?: RelationOption[]): ReactElement {
  const fieldType = resolveFieldType(field)

  return renderFieldByType(fieldType, {
    name: field.name,
    label: field.ui?.title,
    placeholder: field.ui?.placeholder,
    helperText: field.ui?.description,
    required: field.required,
    enumValues: field.enumValues,
    constraints: field.constraints,
    fieldProps: field.ui?.fieldProps,
    relationOptions,
  })
}

/**
 * Component for rendering a field with auto-loading relation options
 *
 * Uses RelationFieldProvider context for automatic loading of
 * options for fields with `relationMeta()`.
 *
 * @example
 * ```tsx
 * <RelationFieldProvider relations={[{ model: 'Category', useQuery: useFindManyCategory, labelField: 'name' }]}>
 *   <SchemaFieldWithRelations field={categoryField} />
 * </RelationFieldProvider>
 * ```
 */
export function SchemaFieldWithRelations({ field }: { field: SchemaFieldInfo }): ReactElement {
  const relationContext = useRelationFieldContext()

  // Check if relation config exists in fieldProps
  const relationConfig = field.ui?.fieldProps?.relation as RelationFieldConfig | undefined

  // If relation config and context exist - get options
  let relationOptions: RelationOption[] | undefined
  if (relationConfig && relationContext) {
    const state = relationContext.getState(relationConfig.model)
    if (!state.isLoading && state.options.length > 0) {
      relationOptions = state.options
    }
  }

  return renderSchemaField(field, relationOptions)
}
