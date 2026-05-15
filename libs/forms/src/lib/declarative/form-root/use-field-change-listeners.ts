'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AppFormApi, FieldChangeApi, OnFieldChangeMap } from '../types'

/**
 * Получить вложенное значение из объекта по dot-path.
 * Пример: getNestedValue({ a: { b: 1 } }, 'a.b') → 1
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
 * Хук для подписки на изменения конкретных полей формы.
 *
 * Использует `form.store.subscribe()` для отслеживания изменений и вызывает
 * соответствующий callback когда значение поля изменилось (сравнение через `Object.is`).
 *
 * @param form - TanStack Form API instance
 * @param onFieldChange - Маппинг поле → callback при изменении
 *
 * @example
 * ```tsx
 * useFieldChangeListeners(form, {
 *   name: (value, { setFieldValue }) => {
 *     setFieldValue('slug', transliterate(String(value)))
 *   },
 * })
 * ```
 */
export function useFieldChangeListeners(form: AppFormApi, onFieldChange?: OnFieldChangeMap): void {
  // Храним актуальную версию callbacks в ref,
  // чтобы не переподписываться при inline-объектах
  const callbacksRef = useRef(onFieldChange)
  callbacksRef.current = onFieldChange

  // Предыдущие значения отслеживаемых полей
  const prevValuesRef = useRef<Record<string, unknown>>({})

  // Стабильный FieldChangeApi
  const fieldChangeApi = useMemo<FieldChangeApi>(
    () => ({
      setFieldValue: (name: string, value: unknown) => {
        form.setFieldValue(name, value)
      },
      getFieldValue: (name: string) => {
        return getNestedValue(form.state.values as Record<string, unknown>, name)
      },
      getValues: () => {
        return form.state.values as Record<string, unknown>
      },
    }),
    [form]
  )

  // Инициализация начальных значений отслеживаемых полей
  const initPrevValues = useCallback(() => {
    const callbacks = callbacksRef.current
    if (!callbacks) return

    const values = form.state.values as Record<string, unknown>
    const snapshot: Record<string, unknown> = {}
    for (const key of Object.keys(callbacks)) {
      snapshot[key] = getNestedValue(values, key)
    }
    prevValuesRef.current = snapshot
  }, [form])

  useEffect(() => {
    // Инициализируем snapshot при монтировании
    initPrevValues()

    const subscription = form.store.subscribe(() => {
      const callbacks = callbacksRef.current
      if (!callbacks) return

      const values = form.state.values as Record<string, unknown>
      const prev = prevValuesRef.current

      for (const key of Object.keys(callbacks)) {
        const currentValue = getNestedValue(values, key)
        if (!Object.is(prev[key], currentValue)) {
          prev[key] = currentValue
          callbacks[key](currentValue, fieldChangeApi)
        }
      }
    })

    // Совместимость: @tanstack/store 0.9+ returns Subscription, ранние — () => void
    if (typeof subscription === 'function') {
      return subscription
    }
    return () => subscription.unsubscribe()
  }, [form, fieldChangeApi, initPrevValues])
}
