'use client'

import { useEffect, useState } from 'react'
import { useFormContext } from '../context'

/**
 * Returns the number of form fields that differ from their default values.
 *
 * Useful for displaying a badge like "Filters (3)" on a collapsed filter panel.
 * Must be used inside a <Form> component.
 *
 * Supports primitives, arrays (order-insensitive comparison), and nested objects.
 *
 * @param defaults - Default values to compare against
 * @returns Number of fields with non-default values
 *
 * @example
 * ```tsx
 * function FilterButton() {
 *   const count = useActiveFiltersCount(defaultFilters)
 *   return (
 *     <Button>
 *       Filters {count > 0 && <Badge>{count}</Badge>}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useActiveFiltersCount<TData extends object>(defaults: TData): number {
  const form = useFormContext()

  const [count, setCount] = useState(() =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countDiff((form.state as any).values as TData, defaults)
  )

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = (form.store as any).subscribe(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCount(countDiff((form.state as any).values as TData, defaults))
    })
    return unsubscribe
  }, [form, defaults])

  return count
}

/** Количество полей, значение которых не совпадает с дефолтным */
function countDiff<TData extends object>(values: TData, defaults: TData): number {
  let count = 0
  for (const key of Object.keys(defaults) as (keyof TData)[]) {
    if (!isEqual(values[key], defaults[key])) count++
  }
  return count
}

/** Глубокое сравнение для примитивов, массивов и простых объектов */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    // Для фильтров (массивы строк) порядок обычно не важен
    const sortedA = [...a].map(String).sort()
    const sortedB = [...b].map(String).sort()
    return sortedA.every((v, i) => v === sortedB[i])
  }

  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)
    if (keysA.length !== keysB.length) return false
    return keysA.every((k) => isEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }

  return false
}
