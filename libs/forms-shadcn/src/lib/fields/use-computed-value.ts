'use client'

import { useDebounce } from '@letar/forms-react'
import { useCallback, useRef, useSyncExternalStore } from 'react'

/**
 * Множество полей, которые сейчас вычисляются — защита от циклических зависимостей.
 */
const computingFields = new Set<string>()

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let result: unknown = obj
  for (const part of parts) {
    if (result && typeof result === 'object') {
      result = (result as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return result
}

function getDepsSnapshot(values: Record<string, unknown>, deps: string[]): unknown[] {
  return deps.map((dep) => getNestedValue(values, dep))
}

function areDepsEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) {
      return false
    }
  }
  return true
}

interface UseComputedValueOptions {
  form: {
    store: { subscribe: (cb: () => void) => (() => void) | { unsubscribe: () => void } }
    state: { values: unknown }
  }
  compute: (values: Record<string, unknown>) => unknown
  deps?: string[]
  debounce?: number
  fieldPath: string
}

/**
 * Хук реактивного вычисления значения на основе других полей формы. Портирован из Chakra-версии
 * (`@letar/forms`) без изменений — framework-free (React-only, `useSyncExternalStore` на
 * `form.store`), общий для обоих скинов.
 */
export function useComputedValue({
  form,
  compute,
  deps,
  debounce: debounceMs = 0,
  fieldPath,
}: UseComputedValueOptions): unknown {
  const prevDepsRef = useRef<unknown[] | null>(null)
  const cachedResultRef = useRef<unknown>(undefined)

  const subscribe = useCallback(
    (callback: () => void) => {
      const subscription = form.store.subscribe(callback)
      if (typeof subscription === 'function') {
        return subscription
      }
      return () => subscription.unsubscribe()
    },
    [form],
  )

  const getSnapshot = useCallback(() => {
    const values = form.state.values as Record<string, unknown>

    if (deps && deps.length > 0) {
      const currentDeps = getDepsSnapshot(values, deps)
      if (prevDepsRef.current && areDepsEqual(prevDepsRef.current, currentDeps)) {
        return cachedResultRef.current
      }
      prevDepsRef.current = currentDeps
    }

    if (computingFields.has(fieldPath)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          `[Form.Field.Calculated] Обнаружена циклическая зависимость: поле "${fieldPath}" `
            + `уже вычисляется. Текущая цепочка: ${[...computingFields].join(' → ')} → ${fieldPath}`,
        )
      }
      return cachedResultRef.current
    }

    try {
      computingFields.add(fieldPath)
      const result = compute(values)
      cachedResultRef.current = result
      return result
    } finally {
      computingFields.delete(fieldPath)
    }
  }, [form, compute, deps, fieldPath])

  const rawValue = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const debouncedValue = useDebounce(rawValue, debounceMs)

  return debounceMs > 0 ? debouncedValue : rawValue
}
