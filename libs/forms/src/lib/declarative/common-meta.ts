'use client'

import type { FieldComponentType, FieldUIMeta } from './types/meta-types'

/**
 * Ready-made presets for system fields (id, createdAt, updatedAt)
 *
 * @example
 * ```ts
 * const UserFormSchema = withUIMeta(UserCreateInputSchema, {
 *   ...commonMeta,  // Adds id, createdAt, updatedAt
 *   name: { title: 'Name' },
 * })
 * ```
 */
export const commonMeta: Record<string, FieldUIMeta> = {
  id: {
    title: 'ID',
    fieldType: 'string',
    fieldProps: { disabled: true },
  },
  createdAt: {
    title: 'Created',
    fieldType: 'date',
    fieldProps: { readOnly: true },
  },
  updatedAt: {
    title: 'Updated',
    fieldType: 'date',
    fieldProps: { readOnly: true },
  },
}

/**
 * Field types for selection from a list (enum/select)
 */
export type SelectionFieldType = Extract<
  FieldComponentType,
  'select' | 'nativeSelect' | 'radioGroup' | 'radioCard' | 'segmentedGroup' | 'checkboxCard' | 'listbox'
>

/**
 * Helper for creating UI metadata for relation fields
 *
 * @example
 * ```ts
 * const OrderFormSchema = withUIMeta(OrderCreateInputSchema, {
 *   categoryId: relationMeta({
 *     title: 'Category',
 *     model: 'Category',
 *     labelField: 'name',
 *   }),
 * })
 * ```
 *
 * @example With custom field type
 * ```ts
 * categoryId: relationMeta({
 *   title: 'Category',
 *   model: 'Category',
 *   labelField: 'name',
 *   fieldType: 'combobox',
 * })
 * ```
 */
export function relationMeta(config: {
  /** Field title */
  title: string
  /** Related model name */
  model: string
  /** Field to display as label */
  labelField: string
  /** Field for value (default 'id') */
  valueField?: string
  /** Component type for display (default 'select') */
  fieldType?: SelectionFieldType
  /** Additional props */
  fieldProps?: Record<string, unknown>
}): FieldUIMeta {
  return {
    title: config.title,
    fieldType: config.fieldType ?? 'select',
    fieldProps: {
      relation: {
        model: config.model,
        labelField: config.labelField,
        valueField: config.valueField ?? 'id',
      },
      ...config.fieldProps,
    },
  }
}

/**
 * Helper for creating UI metadata for enum fields with custom labels
 *
 * @example Simple usage
 * ```ts
 * const UserFormSchema = withUIMeta(UserCreateInputSchema, {
 *   role: enumMeta({
 *     title: 'Role',
 *     labels: {
 *       ADMIN: 'Administrator',
 *       MANAGER: 'Manager',
 *       USER: 'User',
 *       GUEST: 'Guest',
 *     },
 *   }),
 * })
 * ```
 *
 * @example With custom field type
 * ```ts
 * role: enumMeta({
 *   title: 'Role',
 *   fieldType: 'radioCard',
 *   labels: { ADMIN: 'Administrator', USER: 'User' },
 * })
 * ```
 *
 * @example With descriptions for each option
 * ```ts
 * priority: enumMeta({
 *   title: 'Priority',
 *   fieldType: 'radioCard',
 *   options: [
 *     { value: 'LOW', label: 'Low', description: 'Do it sometime' },
 *     { value: 'HIGH', label: 'High', description: 'Urgent!' },
 *   ],
 * })
 * ```
 */
export function enumMeta<T extends string>(
  config:
    | {
        /** Field title */
        title: string
        /** Component type for display (default nativeSelect) */
        fieldType?: SelectionFieldType
        /** Mapping of enum values to custom labels */
        labels: Record<T, string>
        /** Field description */
        description?: string
        /** Additional props */
        fieldProps?: Record<string, unknown>
      }
    | {
        /** Field title */
        title: string
        /** Component type for display (default nativeSelect) */
        fieldType?: SelectionFieldType
        /** Full options with value, label and optional description */
        options: Array<{ value: T; label: string; description?: string }>
        /** Field description */
        description?: string
        /** Additional props */
        fieldProps?: Record<string, unknown>
      }
): FieldUIMeta {
  // Determine options from labels or directly
  let options: Array<{ value: string; label: string; description?: string }>

  if ('labels' in config) {
    options = Object.entries(config.labels).map(([value, label]) => ({
      value,
      label: label as string,
    }))
  } else {
    options = config.options
  }

  return {
    title: config.title,
    description: config.description,
    fieldType: config.fieldType ?? 'nativeSelect',
    fieldProps: {
      options,
      ...config.fieldProps,
    },
  }
}

/**
 * Helper for creating UI metadata for text fields
 *
 * @example
 * ```ts
 * name: textMeta({ title: 'Name', placeholder: 'Enter name' })
 * bio: textMeta({ title: 'About', fieldType: 'richText' })
 * ```
 */
export function textMeta(config: {
  title: string
  placeholder?: string
  description?: string
  fieldType?: 'string' | 'textarea' | 'richText' | 'password' | 'passwordStrength' | 'editable'
  fieldProps?: Record<string, unknown>
}): FieldUIMeta {
  return {
    title: config.title,
    placeholder: config.placeholder,
    description: config.description,
    fieldType: config.fieldType ?? 'string',
    fieldProps: config.fieldProps,
  }
}

/**
 * Helper for creating UI metadata for number fields
 *
 * @example
 * ```ts
 * age: numberMeta({ title: 'Age', min: 0, max: 120 })
 * price: numberMeta({ title: 'Price', fieldType: 'currency', currency: 'RUB' })
 * rating: numberMeta({ title: 'Rating', fieldType: 'rating', count: 5 })
 * ```
 */
export function numberMeta(config: {
  title: string
  description?: string
  fieldType?: 'number' | 'numberInput' | 'slider' | 'rating' | 'currency' | 'percentage'
  min?: number
  max?: number
  step?: number
  currency?: string
  count?: number // for rating
  fieldProps?: Record<string, unknown>
}): FieldUIMeta {
  const { title, description, fieldType, min, max, step, currency, count, fieldProps = {} } = config

  return {
    title,
    description,
    fieldType: fieldType ?? 'number',
    fieldProps: {
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max }),
      ...(step !== undefined && { step }),
      ...(currency && { currency }),
      ...(count !== undefined && { count }),
      ...fieldProps,
    },
  }
}

/**
 * Helper for creating UI metadata for boolean fields
 *
 * @example
 * ```ts
 * isActive: booleanMeta({ title: 'Active', fieldType: 'switch' })
 * newsletter: booleanMeta({ title: 'Newsletter', description: 'Receive news' })
 * ```
 */
export function booleanMeta(config: {
  title: string
  description?: string
  fieldType?: 'checkbox' | 'switch'
  fieldProps?: Record<string, unknown>
}): FieldUIMeta {
  return {
    title: config.title,
    description: config.description,
    fieldType: config.fieldType ?? 'checkbox',
    fieldProps: config.fieldProps,
  }
}

/**
 * Helper for creating UI metadata for date/time fields
 *
 * @example
 * ```ts
 * birthDate: dateMeta({ title: 'Date of birth' })
 * appointment: dateMeta({ title: 'Appointment', fieldType: 'dateTimePicker' })
 * duration: dateMeta({ title: 'Duration', fieldType: 'duration', min: 15, max: 480 })
 * ```
 */
export function dateMeta(config: {
  title: string
  description?: string
  fieldType?: 'date' | 'time' | 'dateRange' | 'dateTimePicker' | 'duration' | 'schedule'
  min?: number | string | Date
  max?: number | string | Date
  fieldProps?: Record<string, unknown>
}): FieldUIMeta {
  const { title, description, fieldType, min, max, fieldProps = {} } = config

  return {
    title,
    description,
    fieldType: fieldType ?? 'date',
    fieldProps: {
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max }),
      ...fieldProps,
    },
  }
}
