'use client'

import type { FieldUIMeta } from './types'
import { unwrapSchemaWithRequired } from './zod-utils'

/**
 * Result анализа схемы поля
 */
export interface FieldSchemaInfo {
  /** UI metadata из .meta({ ui: {...} }) */
  ui?: FieldUIMeta
  /** Обязательно the field (не optional/nullable) */
  required: boolean
}

/**
 * Extracts UI metadata и статус обязательности from Zod schema по пути поля
 *
 * Supports вложенные пути вроде "info.base.rating" и пути arrayов вроде "components.0.title"
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   title: z.string().meta({ ui: { title: 'Название' } }),  // обязательно
 *   subtitle: z.string().optional(),                         // optional
 * })
 *
 * getFieldMeta(schema, 'title')    // { ui: { title: 'Название' }, required: true }
 * getFieldMeta(schema, 'subtitle') // { ui: undefined, required: false }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFieldMeta(schema: any, path: string): FieldSchemaInfo {
  if (!schema) {
    return { required: false }
  }

  const result = getSchemaAtPath(schema, path)
  if (!result.schema) {
    return { required: false }
  }

  // Zod v4: meta is stored in globalRegistry, accessed via .meta() method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldSchema = result.schema as any
  const meta = typeof fieldSchema?.meta === 'function' ? fieldSchema.meta() : undefined

  return {
    ui: meta?.ui as FieldUIMeta | undefined,
    required: result.required,
  }
}

interface SchemaPathResult {
  /** Схема поля ДО финального unwrap (для извлечения мета) */
  schema: unknown
  /** Обязательность поля after анализа всей цепочки */
  required: boolean
}

/**
 * Разворачивает wrapper-typeы схемы (effects, pipeline, transform) до базовой схемы
 * Сохраняет optional/nullable обёртки для корректного определения required
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapToBaseSchema(schema: any): any {
  if (!schema?._zod?.def) {
    return schema
  }

  const type = schema._zod.def.type

  // Zod v4: effects (от superRefine, refine) имеют inner схему
  if (type === 'effects' || type === 'transform' || type === 'preprocess') {
    const inner = schema._zod.def.inner ?? schema._zod.def.schema
    if (inner) {
      return unwrapToBaseSchema(inner)
    }
  }

  // Zod v4: pipeline (от pipe) имеет in и out схемы
  if (type === 'pipeline') {
    const inner = schema._zod.def.in
    if (inner) {
      return unwrapToBaseSchema(inner)
    }
  }

  return schema
}

/**
 * Навигация к схеме по заданному пути
 * Обрабатывает objectы, arrayы и обёртки optional/nullable/effects/pipeline
 * Returns и схему, и статус обязательности
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaAtPath(schema: any, path: string): SchemaPathResult {
  if (!schema || !path) {
    return { schema, required: true }
  }

  const parts = path.split('.')
  let current = schema
  let isRequired = true

  for (const part of parts) {
    // Сначала разворачиваем effects/pipeline/transform до базовой схемы
    current = unwrapToBaseSchema(current)

    const unwrapped = unwrapSchemaWithRequired(current)
    current = unwrapped.schema
    // Отслеживаем, встретили ли optional/nullable
    if (!unwrapped.required) {
      isRequired = false
    }

    if (!current) {
      return { schema: undefined, required: false }
    }

    // Снова разворачиваем after unwrap (effects могут быть inside optional)
    current = unwrapToBaseSchema(current)

    // Пропускаем numberвые индексы (elementы arrayа используют схему elementа)
    if (/^\d+$/.test(part)) {
      // For arrays get element schema
      if (current._zod?.def?.type === 'array') {
        current = current._zod.def.element
      }
      continue
    }

    // Transitionим в shape objectа
    if (current._zod?.def?.type === 'object') {
      const shape = current._zod.def.shape
      if (shape && part in shape) {
        current = shape[part]
      } else {
        return { schema: undefined, required: false }
      }
    } else {
      return { schema: undefined, required: false }
    }
  }

  // Разворачиваем only effects/pipeline, сохраняя default/optional для мета
  current = unwrapToBaseSchema(current)

  // Определяем required based on typeа обёртки, но возвращаем схему ДО unwrap
  // чтобы can было получить мета из .meta()
  const finalUnwrap = unwrapSchemaWithRequired(current)

  return {
    // Возвращаем схему ДО unwrap — на ней can быть мета (.default().meta())
    schema: current,
    required: isRequired && finalUnwrap.required,
  }
}
