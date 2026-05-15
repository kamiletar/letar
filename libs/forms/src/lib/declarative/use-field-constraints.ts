'use client'

import { useMemo } from 'react'
import { useFormGroup } from '../form-group'
import { useDeclarativeFormOptional } from './form-context'
import { getZodConstraints, type ZodConstraints } from './schema-constraints'

/**
 * Result хука useFieldConstraints
 */
export interface UseFieldConstraintsResult {
  /** Извлечённые constraints from Zod schema */
  constraints: ZodConstraints | undefined
  /** Полный path к полю (с учётом вложенных групп) */
  fullPath: string | undefined
}

/**
 * Hook для извлечения constraints from Zod schema для поля form
 *
 * Automatically учитывает вложенность Form.Group и returns constraints
 * based on typeа поля в схеме.
 *
 * @example
 * ```tsx
 * // В componentе поля
 * function FieldNumber({ name, min: minProp, max: maxProp }) {
 *   const { constraints } = useFieldConstraints(name)
 *
 *   // Props take priority over constraints from schema
 *   const min = minProp ?? constraints?.number?.min
 *   const max = maxProp ?? constraints?.number?.max
 *
 *   return <Input type="number" min={min} max={max} />
 * }
 *
 * // При использовании со схемой
 * const schema = z.object({
 *   rating: z.number().min(1).max(10),
 * })
 *
 * <Form schema={schema} initialValue={{ rating: 5 }}>
 *   <Form.Field.Number name="rating" />  // min=1, max=10 automatically
 * </Form>
 * ```
 */
export function useFieldConstraints(name?: string): UseFieldConstraintsResult {
  const formContext = useDeclarativeFormOptional()
  const groupContext = useFormGroup()

  // Вычисляем полный path с учётом вложенных групп
  const fullPath = useMemo(() => {
    if (!name && !groupContext?.name) {
      return undefined
    }
    if (!name) {
      return groupContext?.name
    }
    return groupContext?.name ? `${groupContext.name}.${name}` : name
  }, [name, groupContext?.name])

  // Извлекаем constraints from schema
  const constraints = useMemo(() => {
    if (!formContext?.schema || !fullPath) {
      return undefined
    }
    return getZodConstraints(formContext.schema, fullPath)
  }, [formContext?.schema, fullPath])

  return { constraints, fullPath }
}
