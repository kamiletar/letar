'use client'

import type { ReactElement, ReactNode } from 'react'
import { ButtonSubmit } from '../form-buttons'
import {
  camelCaseToLabel,
  FieldAuto,
  FieldCheckbox,
  FieldCurrency,
  FieldDate,
  FieldNativeSelect,
  FieldNumber,
  FieldPassword,
  FieldPercentage,
  FieldPhone,
  FieldRating,
  FieldSelect,
  FieldSlider,
  FieldString,
  FieldSwitch,
  FieldTextarea,
} from '../form-fields'
import { Form } from '../form-root'
import type { FormMiddleware, ValidateOn } from '../types'
import type { BaseOption } from '../types/option-types'
import type { FieldSize } from '../types/size-types'

// =============================================================================
// Field Config Types
// =============================================================================

/**
 * Base field configuration
 */
interface BaseFieldConfig {
  /** Field name (key in form data) */
  name: string
  /** Field label (if not specified, generated from name) */
  label?: string
  /** Placeholder */
  placeholder?: string
  /** Helper text below field */
  helperText?: string
  /** Required field */
  required?: boolean
  /** Disabled */
  disabled?: boolean
  /** Size */
  size?: FieldSize
}

/**
 * Text field configuration
 */
interface StringFieldConfig extends BaseFieldConfig {
  type: 'string'
  /** Maximum length */
  maxLength?: number
}

/**
 * Multiline field configuration
 */
interface TextareaFieldConfig extends BaseFieldConfig {
  type: 'textarea'
  /** Number of rows */
  rows?: number
}

/**
 * Number field configuration
 */
interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number'
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step */
  step?: number
}

/**
 * Currency field configuration
 */
interface CurrencyFieldConfig extends BaseFieldConfig {
  type: 'currency'
  /** Currency code (by default 'RUB') */
  currency?: string
}

/**
 * Percentage field configuration
 */
interface PercentageFieldConfig extends BaseFieldConfig {
  type: 'percentage'
}

/**
 * Slider configuration
 */
interface SliderFieldConfig extends BaseFieldConfig {
  type: 'slider'
  min?: number
  max?: number
  step?: number
}

/**
 * Rating configuration
 */
interface RatingFieldConfig extends BaseFieldConfig {
  type: 'rating'
  /** Maximum value (by default 5) */
  max?: number
}

/**
 * Checkbox configuration
 */
interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox'
}

/**
 * Switch configuration
 */
interface SwitchFieldConfig extends BaseFieldConfig {
  type: 'switch'
}

/**
 * Select configuration
 */
interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select'
  /** Options for selection */
  options: BaseOption[]
  /** Use NativeSelect */
  native?: boolean
}

/**
 * Date configuration
 */
interface DateFieldConfig extends BaseFieldConfig {
  type: 'date'
}

/**
 * Password configuration
 */
interface PasswordFieldConfig extends BaseFieldConfig {
  type: 'password'
}

/**
 * Phone configuration
 */
interface PhoneFieldConfig extends BaseFieldConfig {
  type: 'phone'
}

/**
 * Auto-field configuration (type determined from schema)
 */
interface AutoFieldConfig extends BaseFieldConfig {
  type: 'auto'
}

/**
 * Union type of field configuration
 */
export type FieldConfig =
  | StringFieldConfig
  | TextareaFieldConfig
  | NumberFieldConfig
  | CurrencyFieldConfig
  | PercentageFieldConfig
  | SliderFieldConfig
  | RatingFieldConfig
  | CheckboxFieldConfig
  | SwitchFieldConfig
  | SelectFieldConfig
  | DateFieldConfig
  | PasswordFieldConfig
  | PhoneFieldConfig
  | AutoFieldConfig

// =============================================================================
// Form Builder Config
// =============================================================================

/**
 * Form section for grouping fields
 */
export interface FormBuilderSection {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Fields in section */
  fields: FieldConfig[]
}

/**
 * Form configuration for FormBuilder
 */
export interface FormBuilderConfig {
  /** Form fields (simple list) */
  fields?: FieldConfig[]
  /** Form sections (for grouping) */
  sections?: FormBuilderSection[]
}

// =============================================================================
// Form Builder Props
// =============================================================================

/**
 * Props for FormBuilder
 */
export interface FormBuilderProps<TData extends object> {
  /** Form configuration */
  config: FormBuilderConfig
  /** Initial values */
  initialValue: TData
  /** Submit handler */
  onSubmit: (data: TData) => void | Promise<void>
  /** Zod schema for validation */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
  /** Validation mode */
  validateOn?: ValidateOn | ValidateOn[]
  /** Middleware */
  middleware?: FormMiddleware<TData>
  /** Disable all fields */
  disabled?: boolean
  /** Read only */
  readOnly?: boolean
  /** Submit button text */
  submitLabel?: string
  /** Additional content after fields */
  children?: ReactNode
}

// =============================================================================
// Field Renderer
// =============================================================================

/**
 * Extracts base props from configuration
 */
function getBaseProps(config: FieldConfig) {
  return {
    placeholder: config.placeholder,
    helperText: config.helperText,
    required: config.required,
    disabled: config.disabled,
  }
}

/**
 * Renders field by configuration
 */
function renderField(config: FieldConfig): ReactElement {
  const { name, label } = config
  const resolvedLabel = label ?? camelCaseToLabel(name)
  const baseProps = getBaseProps(config)

  switch (config.type) {
    case 'string':
      return <FieldString key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'textarea':
      return <FieldTextarea key={name} name={name} label={resolvedLabel} rows={config.rows} {...baseProps} />

    case 'number':
      return (
        <FieldNumber key={name} name={name} label={resolvedLabel} min={config.min} max={config.max} {...baseProps} />
      )

    case 'currency':
      return <FieldCurrency key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'percentage':
      return <FieldPercentage key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'slider':
      return (
        <FieldSlider
          key={name}
          name={name}
          label={resolvedLabel}
          min={config.min}
          max={config.max}
          step={config.step}
          {...baseProps}
        />
      )

    case 'rating':
      return <FieldRating key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'checkbox':
      return <FieldCheckbox key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'switch':
      return <FieldSwitch key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'select':
      if (config.native) {
        // NativeSelect uses title instead of label
        const nativeOptions = config.options.map((opt) => ({
          title: opt.label,
          value: opt.value,
        }))
        return <FieldNativeSelect key={name} name={name} label={resolvedLabel} options={nativeOptions} {...baseProps} />
      }
      return <FieldSelect key={name} name={name} label={resolvedLabel} options={config.options} {...baseProps} />

    case 'date':
      return <FieldDate key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'password':
      return <FieldPassword key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'phone':
      return <FieldPhone key={name} name={name} label={resolvedLabel} {...baseProps} />

    case 'auto':
      return <FieldAuto key={name} name={name} label={resolvedLabel} {...baseProps} />

    default:
      return <FieldString key={name} name={name} label={resolvedLabel} {...baseProps} />
  }
}

// =============================================================================
// Form Builder Component
// =============================================================================

/**
 * Form.Builder - Form generation from JSON configuration
 *
 * Allows creating forms declaratively via configuration object
 * instead of writing JSX.
 *
 * @example Simple form
 * ```tsx
 * const config = {
 *   fields: [
 *     { type: 'string', name: 'firstName', label: 'Name' },
 *     { type: 'string', name: 'lastName', label: 'Last Name' },
 *     { type: 'string', name: 'email', label: 'Email', placeholder: 'email@example.com' },
 *     { type: 'number', name: 'age', label: 'Age', min: 0, max: 120 },
 *     { type: 'select', name: 'role', label: 'Role', options: [
 *       { label: 'User', value: 'user' },
 *       { label: 'Administrator', value: 'admin' },
 *     ]},
 *   ]
 * }
 *
 * <Form.Builder
 *   config={config}
 *   initialValue={{ firstName: '', lastName: '', email: '', age: 18, role: 'user' }}
 *   onSubmit={handleSubmit}
 * />
 * ```
 *
 * @example With sections
 * ```tsx
 * const config = {
 *   sections: [
 *     {
 *       title: 'Personal data',
 *       fields: [
 *         { type: 'string', name: 'firstName' },
 *         { type: 'string', name: 'lastName' },
 *       ]
 *     },
 *     {
 *       title: 'Contacts',
 *       fields: [
 *         { type: 'string', name: 'email' },
 *         { type: 'phone', name: 'phone' },
 *       ]
 *     },
 *   ]
 * }
 *
 * <Form.Builder config={config} ... />
 * ```
 *
 * @example With auto-fields (type determined from Zod schema)
 * ```tsx
 * const config = {
 *   fields: [
 *     { type: 'auto', name: 'firstName' },
 *     { type: 'auto', name: 'age' },
 *     { type: 'auto', name: 'isActive' },
 *   ]
 * }
 *
 * <Form.Builder config={config} schema={UserSchema} ... />
 * ```
 */
export function FormBuilder<TData extends object>({
  config,
  initialValue,
  onSubmit,
  schema,
  validateOn,
  middleware,
  disabled,
  readOnly,
  submitLabel = 'Save',
  children,
}: FormBuilderProps<TData>): ReactElement {
  return (
    <Form
      initialValue={initialValue}
      onSubmit={onSubmit}
      schema={schema}
      validateOn={validateOn}
      middleware={middleware}
      disabled={disabled}
      readOnly={readOnly}
    >
      {/* Simple field list */}
      {config.fields?.map((fieldConfig) => renderField(fieldConfig))}

      {/* Sections with fields */}
      {config.sections?.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          {section.title && <h3>{section.title}</h3>}
          {section.description && <p>{section.description}</p>}
          {section.fields.map((fieldConfig) => renderField(fieldConfig))}
        </div>
      ))}

      {/* Additional content */}
      {children}

      {/* Submit button */}
      <ButtonSubmit>{submitLabel}</ButtonSubmit>
    </Form>
  )
}

FormBuilder.displayName = 'FormBuilder'
