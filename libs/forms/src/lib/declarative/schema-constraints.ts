'use client'

import { unwrapSchema } from './zod-utils'

/**
 * Constraint extraction from Zod v4 schemas for automatic form field configuration
 *
 * Supports:
 * - Strings: minLength, maxLength, email, url, regex
 * - Numbers: min, max, step (int, multipleOf), positive/negative
 * - Dates: min, max
 * - Arrays: minItems, maxItems
 *
 * Zod v4 structure:
 * - Checks are stored in `schema._zod.def.checks[]`
 * - Each check has `_zod.def` with type and parameters
 */

// =============================================================================
// Constraint types
// =============================================================================

/** Constraints for string fields */
export interface ZodStringConstraints {
  minLength?: number
  maxLength?: number
  /** Automatically input type based on Zod checks (email, url) */
  inputType?: 'text' | 'email' | 'url' | 'tel'
  /** HTML5 pattern from regex */
  pattern?: string
}

/** Constraints for number fields */
export interface ZodNumberConstraints {
  min?: number
  max?: number
  step?: number
  isInteger?: boolean
}

/** Constraints for date fields */
export interface ZodDateConstraints {
  /** Minimum date in YYYY-MM-DD format */
  min?: string
  /** Maximum date in YYYY-MM-DD format */
  max?: string
}

/** Constraints for arrays */
export interface ZodArrayConstraints {
  minItems?: number
  maxItems?: number
}

/** Result of constraint extraction from schema */
export interface ZodConstraints {
  string?: ZodStringConstraints
  number?: ZodNumberConstraints
  date?: ZodDateConstraints
  array?: ZodArrayConstraints
  /** Schema type to determine which constraints to apply */
  schemaType?: 'string' | 'number' | 'date' | 'array' | 'boolean' | 'enum' | 'unknown'
}

// =============================================================================
// Main function
// =============================================================================

/**
 * Extracts constraints from Zod schema by field path
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   title: z.string().min(2).max(100),
 *   rating: z.number().min(1).max(10),
 *   birthday: z.date().min(new Date('1900-01-01')),
 *   tags: z.array(z.string()).max(5),
 * })
 *
 * getZodConstraints(schema, 'title')
 * // { schemaType: 'string', string: { minLength: 2, maxLength: 100 } }
 *
 * getZodConstraints(schema, 'rating')
 * // { schemaType: 'number', number: { min: 1, max: 10 } }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getZodConstraints(schema: any, path: string): ZodConstraints {
  if (!schema) {
    return { schemaType: 'unknown' }
  }

  const fieldSchema = getSchemaAtPath(schema, path)
  if (!fieldSchema) {
    return { schemaType: 'unknown' }
  }

  const def = fieldSchema._zod?.def
  if (!def) {
    return { schemaType: 'unknown' }
  }

  const type = def.type
  const checks = def.checks || []

  switch (type) {
    case 'string':
      return {
        schemaType: 'string',
        string: extractStringConstraints(checks),
      }

    case 'number':
      return {
        schemaType: 'number',
        number: extractNumberConstraints(checks),
      }

    case 'date':
      return {
        schemaType: 'date',
        date: extractDateConstraints(checks),
      }

    case 'array':
      return {
        schemaType: 'array',
        array: extractArrayConstraints(checks),
      }

    case 'boolean':
      return { schemaType: 'boolean' }

    case 'enum':
      return { schemaType: 'enum' }

    default:
      return { schemaType: 'unknown' }
  }
}

// =============================================================================
// Constraint extraction by types (Zod v4 structure)
// =============================================================================

/**
 * Handler type for a check
 * Receives constraints object and checkDef, modifies constraints
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheckHandler<T> = (constraints: T, checkDef: any) => void

/**
 * Generic function to extract constraints from Zod checks
 *
 * The handler pattern avoids duplicating iteration logic.
 * Each type (string, number, date, array) defines its own handlers.
 *
 * @param checks - Array of Zod checks from schema
 * @param handlers - Object with handlers for each check type
 * @returns Constraints object populated by handlers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractConstraints<T extends object>(checks: any[], handlers: Record<string, CheckHandler<T>>): T {
  const constraints = {} as T

  for (const check of checks) {
    const checkDef = check._zod?.def
    if (!checkDef) {
      continue
    }

    const handler = handlers[checkDef.check]
    if (handler) {
      handler(constraints, checkDef)
    }
  }

  return constraints
}

// =============================================================================
// Handlers for string constraints
// =============================================================================

const stringConstraintHandlers: Record<string, CheckHandler<ZodStringConstraints>> = {
  min_length: (c, def) => {
    c.minLength = def.minimum
  },
  max_length: (c, def) => {
    c.maxLength = def.maximum
  },
  length_equals: (c, def) => {
    // Exact length = both min and max
    c.minLength = def.length
    c.maxLength = def.length
  },
  string_format: (c, def) => {
    // email(), url() and other formats
    if (def.format === 'email') {
      c.inputType = 'email'
    } else if (def.format === 'url') {
      c.inputType = 'url'
    } else if (def.format === 'regex' && def.pattern?.source) {
      c.pattern = def.pattern.source
    }
  },
}

/**
 * Extracts constraints from string checks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStringConstraints(checks: any[]): ZodStringConstraints {
  return extractConstraints(checks, stringConstraintHandlers)
}

// =============================================================================
// Handlers for number constraints
// =============================================================================

const numberConstraintHandlers: Record<string, CheckHandler<ZodNumberConstraints>> = {
  greater_than: (c, def) => {
    // min() creates inclusive: true, gt() creates inclusive: false
    c.min = def.value
  },
  less_than: (c, def) => {
    // max() creates inclusive: true, lt() creates inclusive: false
    c.max = def.value
  },
  number_format: (c, def) => {
    // int() creates format: 'safeint'
    if (def.format === 'safeint') {
      c.isInteger = true
      c.step = 1
    }
  },
  multiple_of: (c, def) => {
    c.step = def.value
  },
}

/**
 * Extracts constraints from number checks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNumberConstraints(checks: any[]): ZodNumberConstraints {
  return extractConstraints(checks, numberConstraintHandlers)
}

// =============================================================================
// Handlers for date constraints
// =============================================================================

const dateConstraintHandlers: Record<string, CheckHandler<ZodDateConstraints>> = {
  greater_than: (c, def) => {
    // min() for dates
    if (def.value) {
      c.min = formatDateToISO(def.value)
    }
  },
  less_than: (c, def) => {
    // max() for dates
    if (def.value) {
      c.max = formatDateToISO(def.value)
    }
  },
}

/**
 * Extracts constraints from date checks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDateConstraints(checks: any[]): ZodDateConstraints {
  return extractConstraints(checks, dateConstraintHandlers)
}

// =============================================================================
// Handlers for array constraints
// =============================================================================

const arrayConstraintHandlers: Record<string, CheckHandler<ZodArrayConstraints>> = {
  min_length: (c, def) => {
    c.minItems = def.minimum
  },
  max_length: (c, def) => {
    c.maxItems = def.maximum
  },
  length: (c, def) => {
    c.minItems = def.length
    c.maxItems = def.length
  },
}

/**
 * Extracts constraints from array checks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractArrayConstraints(checks: any[]): ZodArrayConstraints {
  return extractConstraints(checks, arrayConstraintHandlers)
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Navigate to schema by path (reuses logic from schema-meta.ts)
 * Supports nested objects, arrays, optional/nullable
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaAtPath(schema: any, path: string): any {
  if (!schema || !path) {
    return schema
  }

  const parts = path.split('.')
  let current = schema

  for (const part of parts) {
    current = unwrapSchema(current)

    if (!current) {
      return undefined
    }

    // Skip numeric indices (for arrays we use element schema)
    if (/^\d+$/.test(part)) {
      if (current._zod?.def?.type === 'array') {
        current = current._zod.def.element
      }
      continue
    }

    // Navigate into object shape
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

  return unwrapSchema(current)
}

/**
 * Formats a date to YYYY-MM-DD string for HTML input[type="date"]
 * Accepts Date, ISO string or timestamp
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDateToISO(value: any): string {
  let date: Date

  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string') {
    date = new Date(value)
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else {
    return ''
  }

  if (isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
