'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useDebounce } from '../base/use-debounce'

/**
 * Множество полей, которые сейчас вычисляются.
 * Используется для защиты от циклических зависимостей.
 */
const computingFields = new Set<string>()

/**
 * Получить вложенное значение из объекта по dot-path.
 */
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

/**
 * Создать снапшот значений зависимых полей для сравнения.
 */
function getDepsSnapshot(values: Record<string, unknown>, deps: string[]): unknown[] {
  return deps.map((dep) => getNestedValue(values, dep))
}

/**
 * Сравнить два снапшота зависимостей поэлементно.
 */
function areDepsEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false
  }
  return true
}

interface UseComputedValueOptions {
  /** TanStack Form instance */
  form: {
    store: { subscribe: (cb: () => void) => (() => void) | { unsubscribe: () => void } }
    state: { values: unknown }
  }
  /** Функция вычисления значения */
  compute: (values: Record<string, unknown>) => unknown
  /** Список зависимых полей для оптимизации (без — пересчёт при любом изменении) */
  deps?: string[]
  /** Дебаунс вычислений в мс (0 = без дебаунса) */
  debounce?: number
  /** Полный путь поля (для детекции циклов) */
  fieldPath: string
}

/**
 * Хук реактивного вычисления значения на основе других полей формы.
 *
 * Подписывается на form.store и пересчитывает значение при изменении
 * зависимых полей (или всех, если deps не указаны).
 *
 * @returns Вычисленное значение (с опциональным дебаунсом)
 */
export function useComputedValue({
  form,
  compute,
  deps,
  debounce: debounceMs = 0,
  fieldPath,
}: UseComputedValueOptions): unknown {
  // Предыдущий снапшот зависимостей
  const prevDepsRef = useRef<unknown[] | null>(null)
  // Кэш результата (чтобы useSyncExternalStore не рендерил лишний раз)
  const cachedResultRef = useRef<unknown>(undefined)

  // Подписка на store
  const subscribe = useCallback(
    (callback: () => void) => {
      const subscription = form.store.subscribe(callback)
      if (typeof subscription === 'function') {
        return subscription
      }
      return () => subscription.unsubscribe()
    },
    [form]
  )

  // Снапшот: вычисляем значение
  const getSnapshot = useCallback(() => {
    const values = form.state.values as Record<string, unknown>

    // Если указаны deps — проверяем изменились ли зависимости
    if (deps && deps.length > 0) {
      const currentDeps = getDepsSnapshot(values, deps)
      if (prevDepsRef.current && areDepsEqual(prevDepsRef.current, currentDeps)) {
        return cachedResultRef.current
      }
      prevDepsRef.current = currentDeps
    }

    // Защита от циклических вычислений
    if (computingFields.has(fieldPath)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          `[Form.Field.Calculated] Обнаружена циклическая зависимость: поле "${fieldPath}" ` +
            `уже вычисляется. Текущая цепочка: ${[...computingFields].join(' → ')} → ${fieldPath}`
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

  // Дебаунс (если > 0)
  const debouncedValue = useDebounce(rawValue, debounceMs)

  return debounceMs > 0 ? debouncedValue : rawValue
}
