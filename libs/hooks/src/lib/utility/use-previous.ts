'use client'

import { useEffect, useRef } from 'react'

/**
 * Хук для получения предыдущего значения
 *
 * Сохраняет предыдущее значение переменной между рендерами.
 * Полезен для сравнения изменений или анимаций.
 *
 * @param value - Текущее значение
 * @returns Предыдущее значение (undefined при первом рендере)
 *
 * @example
 * ```tsx
 * const [count, setCount] = useState(0)
 * const prevCount = usePrevious(count)
 *
 * console.log(`Было: ${prevCount}, стало: ${count}`)
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
