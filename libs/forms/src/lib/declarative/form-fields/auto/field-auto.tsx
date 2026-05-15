'use client'

import type { ReactElement } from 'react'
import { useFormGroup } from '../../../form-group'
import { renderFieldByType } from '../../field-type-mapper'
import { useDeclarativeForm } from '../../form-context'
import { getZodConstraints } from '../../schema-constraints'
import type { BaseFieldProps } from '../../types'
import type { FieldUIMeta } from '../../types/meta-types'
import { FieldCheckbox } from '../boolean/field-checkbox'
import { FieldSwitch } from '../boolean/field-switch'
import { FieldDate } from '../datetime/field-date'
import { FieldNumber } from '../number/field-number'
import { FieldNativeSelect } from '../selection/field-native-select'
import { FieldString } from '../text/field-string'
import { FieldTextarea } from '../text/field-textarea'

/**
 * Auto-detection configuration for field type
 */
export interface AutoFieldConfig {
  /**
   * Prefer Switch over Checkbox for boolean
   * @default false
   */
  booleanAsSwitch?: boolean
  /**
   * Use Textarea for long strings (based on maxLength in schema)
   * @default true
   */
  useTextareaForLongStrings?: boolean
  /**
   * Length threshold for using Textarea
   * @default 200
   */
  textareaThreshold?: number
}

/**
 * Props for AutoField
 */
export interface AutoFieldProps extends BaseFieldProps {
  /** Auto-detection configuration */
  config?: AutoFieldConfig
}

/**
 * Extract Zod type from schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getZodType(schema: any): string | undefined {
  if (!schema?._zod?.def) {
    return undefined
  }

  const type = schema._zod.def.type

  // Unwrap wrapper types
  if (type === 'optional' || type === 'nullable' || type === 'default') {
    return getZodType(schema._zod.def.inner)
  }

  return type
}

/**
 * Get enum values from Zod schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEnumValues(schema: any): string[] | undefined {
  if (!schema?._zod?.def) {
    return undefined
  }

  const type = schema._zod.def.type

  // Unwrap wrapper types
  if (type === 'optional' || type === 'nullable' || type === 'default') {
    return getEnumValues(schema._zod.def.inner)
  }

  if (type === 'enum') {
    return schema._zod.def.values
  }

  if (type === 'literal') {
    const value = schema._zod.def.value
    return typeof value === 'string' ? [value] : undefined
  }

  return undefined
}

/**
 * Get maxLength from Zod checks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMaxLength(schema: any): number | undefined {
  if (!schema?._zod?.def?.checks) {
    return undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxCheck = schema._zod.def.checks.find((c: any) => c.kind === 'max_length' || c.kind === 'max')
  return maxCheck?.value
}

/**
 * Get UI meta from Zod schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUIMeta(schema: any): FieldUIMeta | undefined {
  if (!schema?.meta) {
    return undefined
  }

  try {
    const meta = schema.meta()
    return meta?.ui as FieldUIMeta | undefined
  } catch {
    return undefined
  }
}

/**
 * Navigate to schema by path
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaAtPath(schema: any, path: string): any {
  if (!schema || !path) {
    return schema
  }

  const parts = path.split('.')
  let current = schema

  for (const part of parts) {
    // Unwrap wrapper types
    while (current?._zod?.def?.type && ['optional', 'nullable', 'default'].includes(current._zod.def.type)) {
      current = current._zod.def.inner
    }

    if (!current) {
      return undefined
    }

    // Skip numeric indices
    if (/^\d+$/.test(part)) {
      if (current._zod?.def?.type === 'array') {
        current = current._zod.def.element
      }
      continue
    }

    // Navigate into object
    if (current._zod?.def?.type === 'object') {
      const shape = current._zod.def.shape
      if (shape && part in shape) {
        current = shape[part]
      } else {
        return undefined
      }
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Convert camelCase to readable label
 * @example "firstName" → "First Name"
 * @example "createdAt" → "Created At"
 */
export function camelCaseToLabel(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/^./, (s) => s.toUpperCase()) // Capitalize first letter
    .trim()
}

/**
 * Form.Field.Auto - Auto-detection of field type from Zod schema
 *
 * Automatically selects appropriate field component based on Zod schema type:
 * - string → FieldString (or FieldTextarea for long strings)
 * - number/bigint/int/float → FieldNumber
 * - boolean → FieldCheckbox (or FieldSwitch)
 * - date → FieldDate
 * - enum → FieldNativeSelect
 *
 * If label is not specified, it is generated from field name (camelCase → "Readable Label").
 *
 * @example Basic usage
 * ```tsx
 * const schema = z.object({
 *   firstName: z.string(),
 *   age: z.number(),
 *   isActive: z.boolean(),
 *   role: z.enum(['admin', 'user', 'guest']),
 *   createdAt: z.date(),
 * })
 *
 * <Form schema={schema} initialValue={...} onSubmit={...}>
 *   <Form.Field.Auto name="firstName" />  // → FieldString, label="First Name"
 *   <Form.Field.Auto name="age" />        // → FieldNumber, label="Age"
 *   <Form.Field.Auto name="isActive" />   // → FieldCheckbox, label="Is Active"
 *   <Form.Field.Auto name="role" />       // → FieldNativeSelect with options
 *   <Form.Field.Auto name="createdAt" />  // → FieldDate
 * </Form>
 * ```
 *
 * @example With configuration
 * ```tsx
 * <Form.Field.Auto
 *   name="isActive"
 *   config={{ booleanAsSwitch: true }}
 * />
 * ```
 *
 * @example With explicit fieldType in meta
 * ```tsx
 * const schema = z.object({
 *   bio: z.string().meta({ ui: { title: 'Biography', fieldType: 'richText' } }),
 * })
 *
 * <Form.Field.Auto name="bio" />  // → FieldRichText (from meta.fieldType)
 * ```
 */
export function FieldAuto({ name, config, ...baseProps }: AutoFieldProps): ReactElement {
  const { schema } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  if (!name) {
    throw new Error('Form.Field.Auto requires a name prop')
  }

  // Build full path
  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  // Get field schema
  const fieldSchema = getSchemaAtPath(schema, fullPath)
  const zodType = getZodType(fieldSchema)
  const enumValues = getEnumValues(fieldSchema)
  const maxLength = getMaxLength(fieldSchema)
  const uiMeta = getUIMeta(fieldSchema)

  // Auto-label if not specified
  const label = baseProps.label ?? uiMeta?.title ?? camelCaseToLabel(name)

  // If explicit fieldType in meta — use renderFieldByType
  if (uiMeta?.fieldType) {
    const constraints = getZodConstraints(schema, fullPath)
    return renderFieldByType(uiMeta.fieldType, {
      name,
      label,
      placeholder: baseProps.placeholder ?? uiMeta.placeholder,
      helperText: baseProps.helperText ?? uiMeta.description,
      required: baseProps.required,
      disabled: baseProps.disabled,
      readOnly: baseProps.readOnly,
      enumValues,
      constraints,
      fieldProps: uiMeta.fieldProps,
    })
  }

  // Configuration with defaults
  const { booleanAsSwitch = false, useTextareaForLongStrings = true, textareaThreshold = 200 } = config ?? {}

  // Determine component by schema type (fallback)
  switch (zodType) {
    case 'string':
      // Check, Textarea is needed
      if (useTextareaForLongStrings && maxLength && maxLength > textareaThreshold) {
        return <FieldTextarea name={name} label={label} {...baseProps} />
      }
      return <FieldString name={name} label={label} {...baseProps} />

    case 'number':
    case 'bigint':
    case 'int':
    case 'float':
      return <FieldNumber name={name} label={label} {...baseProps} />

    case 'boolean':
      if (booleanAsSwitch) {
        return <FieldSwitch name={name} label={label} {...baseProps} />
      }
      return <FieldCheckbox name={name} label={label} {...baseProps} />

    case 'date':
      return <FieldDate name={name} label={label} {...baseProps} />

    case 'enum':
      if (enumValues) {
        // NativeSelectOption uses title instead of label
        const options = enumValues.map((value) => ({
          title: camelCaseToLabel(value),
          value,
        }))
        return <FieldNativeSelect name={name} label={label} options={options} {...baseProps} />
      }
      return <FieldString name={name} label={label} {...baseProps} />

    default:
      // Fallback to String
      return <FieldString name={name} label={label} {...baseProps} />
  }
}

FieldAuto.displayName = 'FieldAuto'
