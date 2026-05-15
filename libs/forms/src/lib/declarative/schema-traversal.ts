'use client'

import type { ZodConstraints } from './schema-constraints'
import { getZodConstraints } from './schema-constraints'
import type { FieldUIMeta } from './types/meta-types'
import { unwrapSchema } from './zod-utils'

/**
 * Schema field information for form auto-generation
 */
export interface SchemaFieldInfo {
  /** Full path to the field (e.g. "user.address.city") */
  path: string
  /** Field name (last path segment) */
  name: string
  /** Zod type: string, number, boolean, date, enum, object, array */
  zodType: string
  /** UI metadata from .meta({ ui: {...} }) */
  ui?: FieldUIMeta
  /** Required field (not optional/nullable) */
  required: boolean
  /** Constraints (min, max, minLength, maxLength etc.) */
  constraints: ZodConstraints
  /** Nested fields for object type */
  children?: SchemaFieldInfo[]
  /** Element information for array type */
  element?: SchemaFieldInfo
  /** Enum values for enum type */
  enumValues?: string[]
}

/**
 * Get Zod type from schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getZodType(schema: any): string {
  const unwrapped = unwrapSchema(schema)
  return unwrapped?._zod?.def?.type ?? 'unknown'
}

/**
 * Check if the field is required (not optional/nullable)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRequired(schema: any): boolean {
  if (!schema?._zod?.def) {
    return true
  }

  const type = schema._zod.def.type
  if (type === 'optional' || type === 'nullable') {
    return false
  }
  if (type === 'default') {
    // default always has a value, considered not required for UI
    return false
  }

  return true
}

/**
 * Get UI metadata from schema
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
 * Get enum values from schema
 * In Zod v4 we use schema.enum or schema.def.entries
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEnumValues(schema: any): string[] | undefined {
  const unwrapped = unwrapSchema(schema)
  if (!unwrapped?._zod?.def) {
    return undefined
  }

  const type = unwrapped._zod.def.type

  if (type === 'enum') {
    // Zod v4: use .enum for getting values
    // schema.enum returns object { value: "value", ... }
    if (unwrapped.enum && typeof unwrapped.enum === 'object') {
      return Object.values(unwrapped.enum) as string[]
    }
    // Fallback to internal structure (for compatibility)
    if (unwrapped._zod.def.values) {
      return unwrapped._zod.def.values
    }
    // Zod v4 also has def.entries
    if (unwrapped._zod.def.entries) {
      return Object.values(unwrapped._zod.def.entries) as string[]
    }
    return undefined
  }

  if (type === 'literal') {
    const value = unwrapped._zod.def.value
    return typeof value === 'string' ? [value] : undefined
  }

  return undefined
}

// =============================================================================
// Circular reference protection
// =============================================================================

/** Maximum recursion depth for infinite loop protection */
const MAX_TRAVERSAL_DEPTH = 20

/**
 * Schema traversal context
 * Stores visited schemas and current depth for cycle protection
 */
interface TraversalContext {
  /** Set of visited schemas (for cycle detection) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visited: WeakSet<any>
  /** Current recursion depth */
  depth: number
}

/**
 * Create a new traversal context
 */
function createTraversalContext(): TraversalContext {
  return {
    visited: new WeakSet(),
    depth: 0,
  }
}

/**
 * Check if traversal can continue
 * Returns false if schema was already visited or maximum depth is reached
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function canTraverse(schema: any, ctx: TraversalContext): boolean {
  // Depth check
  if (ctx.depth >= MAX_TRAVERSAL_DEPTH) {
    console.warn(`schema-traversal: Maximum depth (${MAX_TRAVERSAL_DEPTH}) exceeded, stopping recursion`)
    return false
  }

  // Circular reference check
  if (schema && typeof schema === 'object' && ctx.visited.has(schema)) {
    console.warn('schema-traversal: Circular reference detected, stopping recursion')
    return false
  }

  return true
}

/**
 * Mark schema as visited
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function markVisited(schema: any, ctx: TraversalContext): void {
  if (schema && typeof schema === 'object') {
    ctx.visited.add(schema)
  }
}

// =============================================================================
// Schema traversal functions
// =============================================================================

/**
 * Analyze an array element
 */

function analyzeArrayElement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod internal schema type
  elementSchema: any,
  parentPath: string,
  ctx: TraversalContext
): SchemaFieldInfo | undefined {
  if (!canTraverse(elementSchema, ctx)) {
    return undefined
  }
  markVisited(elementSchema, ctx)

  const unwrapped = unwrapSchema(elementSchema)
  const zodType = getZodType(unwrapped)
  // For array elements the path is parent path + [*]
  const path = `${parentPath}[*]`

  const fieldInfo: SchemaFieldInfo = {
    path,
    name: '*',
    zodType,
    ui: getUIMeta(elementSchema),
    required: isRequired(elementSchema),
    constraints: {}, // Constraints for elements are determined separately
  }

  // If element is an object, recursively traverse its fields
  if (zodType === 'object' && unwrapped._zod?.def?.shape) {
    const children = traverseSchemaShape(unwrapped._zod.def.shape, path, { ...ctx, depth: ctx.depth + 1 })
    if (children.length > 0) {
      fieldInfo.children = children
    }
  }

  // If element is an enum
  if (zodType === 'enum' || zodType === 'literal') {
    fieldInfo.enumValues = getEnumValues(elementSchema)
  }

  return fieldInfo
}

/**
 * Traverse object shape and return field information
 */

function traverseSchemaShape(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod internal shape type
  shape: Record<string, any>,
  parentPath = '',
  ctx: TraversalContext = createTraversalContext()
): SchemaFieldInfo[] {
  const fields: SchemaFieldInfo[] = []

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    if (!canTraverse(fieldSchema, ctx)) {
      continue
    }
    markVisited(fieldSchema, ctx)

    const path = parentPath ? `${parentPath}.${fieldName}` : fieldName
    const unwrapped = unwrapSchema(fieldSchema)
    const zodType = getZodType(fieldSchema)

    const fieldInfo: SchemaFieldInfo = {
      path,
      name: fieldName,
      zodType,
      ui: getUIMeta(fieldSchema),
      required: isRequired(fieldSchema),
      constraints: getZodConstraints(fieldSchema, ''),
    }

    // Handle nested objects
    if (zodType === 'object' && unwrapped._zod?.def?.shape) {
      const children = traverseSchemaShape(unwrapped._zod.def.shape, path, { ...ctx, depth: ctx.depth + 1 })
      if (children.length > 0) {
        fieldInfo.children = children
      }
    }

    // Handle arrays
    if (zodType === 'array' && unwrapped._zod?.def?.element) {
      const element = analyzeArrayElement(unwrapped._zod.def.element, path, { ...ctx, depth: ctx.depth + 1 })
      if (element) {
        fieldInfo.element = element
      }
    }

    // Handle enum
    if (zodType === 'enum' || zodType === 'literal') {
      fieldInfo.enumValues = getEnumValues(fieldSchema)
    }

    fields.push(fieldInfo)
  }

  return fields
}

/**
 * Traverse Zod schema and return information about all fields
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   firstName: z.string().meta({ ui: { title: 'Name' } }),
 *   address: z.object({
 *     city: z.string(),
 *     zip: z.string(),
 *   }),
 *   tags: z.array(z.string()),
 * })
 *
 * const fields = traverseSchema(schema)
 * // [
 * //   { path: 'firstName', zodType: 'string', ui: { title: 'Name' }, ... },
 * //   { path: 'address', zodType: 'object', children: [...] },
 * //   { path: 'tags', zodType: 'array', element: { zodType: 'string' } },
 * // ]
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function traverseSchema(schema: any): SchemaFieldInfo[] {
  if (!schema?._zod?.def) {
    return []
  }

  const unwrapped = unwrapSchema(schema)
  const type = unwrapped._zod?.def?.type

  // Only support object at the top level
  if (type !== 'object' || !unwrapped._zod?.def?.shape) {
    return []
  }

  return traverseSchemaShape(unwrapped._zod.def.shape)
}

/**
 * Get flat list of all field paths (for include/exclude filtering)
 */
export function getFieldPaths(fields: SchemaFieldInfo[], recursive = true): string[] {
  const paths: string[] = []

  for (const field of fields) {
    paths.push(field.path)

    if (recursive && field.children) {
      paths.push(...getFieldPaths(field.children, recursive))
    }
  }

  return paths
}

/**
 * Filter fields by include/exclude
 */
export function filterFields(
  fields: SchemaFieldInfo[],
  options: { include?: string[]; exclude?: string[] }
): SchemaFieldInfo[] {
  const { include, exclude } = options

  return fields.filter((field) => {
    // Check by field name for top-level filtering
    if (include && !include.includes(field.name)) {
      return false
    }
    if (exclude && exclude.includes(field.name)) {
      return false
    }
    return true
  })
}
