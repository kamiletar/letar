/**
 * Utilities for working with Zod v4 schemaми
 *
 * Общие features для разворачивания обёрток схемы
 * (optional, nullable, default) и получения базовой схемы.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Result разворачивания схемы с инformцией об обязательности
 */
export interface UnwrapResult {
  /** Развёрнутая schema (без optional/nullable/default обёрток) */
  schema: any
  /** Является the field обязательным (false if было optional/nullable) */
  required: boolean
}

/**
 * Разворачивает обёртки optional/nullable/default и returns базовую схему
 *
 * Supports как Zod v4 (inner), так и возможные различия в API.
 *
 * @example
 * ```ts
 * const innerSchema = unwrapSchema(z.string().optional())
 * // innerSchema will z.string()
 * ```
 */
export function unwrapSchema(schema: any): any {
  if (!schema?._zod?.def) {
    return schema
  }

  const type = schema._zod.def.type

  // Разворачиваем wrapper-typeы
  // Zod v4 uses inner или innerType depending on версии
  if (type === 'optional' || type === 'nullable' || type === 'default') {
    const inner = schema._zod.def.inner ?? schema._zod.def.innerType
    if (inner) {
      return unwrapSchema(inner)
    }
  }

  return schema
}

/**
 * Разворачивает схему и returns инformцию об обязательности поля
 *
 * В отличие от `unwrapSchema`, also отслеживает была ли schema optional/nullable.
 *
 * @example
 * ```ts
 * const { schema, required } = unwrapSchemaWithRequired(z.string().optional())
 * // schema = z.string()
 * // required = false
 * ```
 */
export function unwrapSchemaWithRequired(schema: any): UnwrapResult {
  if (!schema?._zod?.def) {
    return { schema, required: true }
  }

  const type = schema._zod.def.type

  // Разворачиваем обёртки, чтобы получить внутреннюю схему
  if (type === 'optional' || type === 'nullable') {
    const inner = schema._zod.def.inner ?? schema._zod.def.innerType
    if (inner) {
      const result = unwrapSchemaWithRequired(inner)
      return { schema: result.schema, required: false } // optional/nullable = НЕ обязательно
    }
  }

  if (type === 'default') {
    // default() делает field необязательным для HTML form — value подставится automatically
    const inner = schema._zod.def.inner ?? schema._zod.def.innerType
    if (inner) {
      const result = unwrapSchemaWithRequired(inner)
      return { schema: result.schema, required: false }
    }
  }

  return { schema, required: true }
}

/**
 * Получает type Zod схемы
 */
export function getZodType(schema: any): string | undefined {
  return schema?._zod?.def?.type
}

/**
 * Checks, is ли schema optional
 */
export function isOptionalSchema(schema: any): boolean {
  const type = getZodType(schema)
  return type === 'optional' || type === 'nullable'
}

/**
 * Checks, имеет ли schema default value
 */
export function hasDefaultValue(schema: any): boolean {
  return getZodType(schema) === 'default'
}
