'use client'

import { z } from 'zod/v4'
import type { FieldUIMeta } from './types/meta-types'
import { unwrapSchema } from './zod-utils'

/**
 * UI metadata configuration for flat schemas (top-level fields only)
 */
export type UIMetaConfig<T extends z.ZodRawShape> = {
  [K in keyof T]?: FieldUIMeta
}

/** Mutable type for creating a new shape */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutableShape = { [key: string]: any }

/**
 * UI metadata configuration with nested object support
 * For nested objects, use _meta for the group's own metadata
 */
export type DeepUIMetaConfig<T extends z.ZodRawShape> = {
  [K in keyof T]?: FieldUIMeta | ({ _meta?: FieldUIMeta } & Record<string, FieldUIMeta | unknown>)
}

/**
 * Check if a schema is a ZodObject
 */
function isZodObject(schema: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (schema as any)?._zod?.def?.type === 'object'
}

/**
 * Check if the configuration contains nested settings
 */
function hasNestedConfig(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) {
    return false
  }

  // If _meta exists — this is definitely a nested configuration
  if ('_meta' in config) {
    return true
  }

  // Check for nested objects with title/fieldType
  // Exclude standard FieldUIMeta fields
  const fieldUIMetaKeys = ['title', 'description', 'placeholder', 'tooltip', 'fieldType', 'fieldProps']

  for (const [key, value] of Object.entries(config)) {
    // Skip standard FieldUIMeta fields
    if (fieldUIMetaKeys.includes(key)) {
      continue
    }

    // If the value is an object with title/fieldType/description, it's a nested configuration
    if (typeof value === 'object' && value !== null) {
      if ('title' in value || 'fieldType' in value || 'description' in value) {
        return true
      }
    }
  }

  return false
}

/**
 * Enrich ZenStack/Zod schema with UI metadata
 *
 * Adds .meta({ ui: {...} }) to schema fields based on configuration.
 * Works only with top-level fields.
 *
 * @example Basic usage
 * ```ts
 * import { ProductCreateInputSchema } from '@/generated/zod/objects/ProductCreateInput.schema'
 *
 * const ProductFormSchema = withUIMeta(ProductCreateInputSchema, {
 *   name: { title: 'Name', placeholder: 'Enter name' },
 *   price: { title: 'Price', fieldType: 'currency', fieldProps: { currency: 'RUB' } },
 *   isActive: { title: 'Active', fieldType: 'switch' },
 * })
 * ```
 *
 * @example With enum fields
 * ```ts
 * const UserFormSchema = withUIMeta(UserCreateInputSchema, {
 *   role: {
 *     title: 'Role',
 *     fieldType: 'radioCard',
 *     fieldProps: {
 *       options: [
 *         { value: 'ADMIN', label: 'Administrator' },
 *         { value: 'USER', label: 'User' },
 *       ],
 *     },
 *   },
 * })
 * ```
 *
 * @param schema Zod object schema
 * @param config UI metadata configuration for fields
 * @returns New schema with added metadata
 */
export function withUIMeta<T extends z.ZodRawShape>(schema: z.ZodObject<T>, config: UIMetaConfig<T>): z.ZodObject<T> {
  const shape = schema.shape
  const newShape: MutableShape = {}

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const meta = config[key as keyof T]
    if (meta) {
      // Add .meta({ ui: {...} }) to field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newShape[key] = (fieldSchema as any).meta({ ui: meta })
    } else {
      newShape[key] = fieldSchema
    }
  }

  // Preserve strict/passthrough mode if it was set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unknownKeys = (schema as any)._zod?.def?.unknownKeys
  if (unknownKeys === 'strict') {
    return z.object(newShape).strict() as z.ZodObject<T>
  }
  if (unknownKeys === 'passthrough') {
    return z.object(newShape).passthrough() as z.ZodObject<T>
  }

  return z.object(newShape) as z.ZodObject<T>
}

/**
 * Enrich ZenStack/Zod schema with UI metadata with nested object support
 *
 * Extended version of withUIMeta that recursively processes nested objects.
 * Use the `_meta` key for nested group metadata.
 *
 * @example With nested objects
 * ```ts
 * const UserFormSchema = withUIMetaDeep(UserCreateInputSchema, {
 *   firstName: { title: 'First Name' },
 *   lastName: { title: 'Last Name' },
 *   address: {
 *     _meta: { title: 'Shipping Address' },  // meta for the group
 *     country: { title: 'Country', fieldType: 'select' },
 *     city: { title: 'City' },
 *     street: { title: 'Street' },
 *   },
 * })
 * ```
 *
 * @example Deep nesting
 * ```ts
 * const OrderFormSchema = withUIMetaDeep(OrderCreateInputSchema, {
 *   orderNumber: { title: 'Order Number' },
 *   user: {
 *     _meta: { title: 'Customer Data' },
 *     firstName: { title: 'First Name' },
 *     address: {
 *       _meta: { title: 'Address' },
 *       city: { title: 'City' },
 *     },
 *   },
 * })
 * ```
 *
 * @param schema Zod object schema
 * @param config UI metadata configuration (can be nested)
 * @returns New schema with added metadata
 */
export function withUIMetaDeep<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  config: DeepUIMetaConfig<T>
): z.ZodObject<T> {
  const shape = schema.shape
  const newShape: MutableShape = {}

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fieldConfig = config[key as keyof T]

    if (!fieldConfig) {
      newShape[key] = fieldSchema
      continue
    }

    // Get unwrapped schema to check type
    const unwrapped = unwrapSchema(fieldSchema)

    // Check if this is a nested object or a regular field
    if (isZodObject(unwrapped) && hasNestedConfig(fieldConfig)) {
      // This is a nested object with field configuration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { _meta, ...nestedConfig } = fieldConfig as { _meta?: FieldUIMeta } & Record<string, any>

      // Recursively process nested object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let nestedSchema = withUIMetaDeep(unwrapped as any, nestedConfig)

      // Apply _meta to the field itself (for group label)
      if (_meta) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nestedSchema = (nestedSchema as any).meta({ ui: _meta })
      }

      // Restore wrappers (optional, nullable, default)
      newShape[key] = rewrapSchema(fieldSchema, nestedSchema)
    } else {
      // Regular field — just add meta
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newShape[key] = (fieldSchema as any).meta({ ui: fieldConfig as FieldUIMeta })
    }
  }

  // Preserve strict/passthrough mode if it was set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unknownKeys = (schema as any)._zod?.def?.unknownKeys
  if (unknownKeys === 'strict') {
    return z.object(newShape).strict() as z.ZodObject<T>
  }
  if (unknownKeys === 'passthrough') {
    return z.object(newShape).passthrough() as z.ZodObject<T>
  }

  return z.object(newShape) as z.ZodObject<T>
}

/**
 * Restore wrappers (optional, nullable, default) around a new inner schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rewrapSchema(original: any, newInner: any): any {
  if (!original?._zod?.def) {
    return newInner
  }

  const type = original._zod.def.type

  if (type === 'optional') {
    return rewrapSchema(original._zod.def.inner, newInner).optional()
  }
  if (type === 'nullable') {
    return rewrapSchema(original._zod.def.inner, newInner).nullable()
  }
  if (type === 'default') {
    const defaultValue = original._zod.def.defaultValue
    return rewrapSchema(original._zod.def.inner, newInner).default(defaultValue)
  }

  return newInner
}
