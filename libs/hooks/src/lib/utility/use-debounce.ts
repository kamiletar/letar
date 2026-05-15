'use client'

import { useEffect, useState } from 'react'

/**
 * Хук для debounce значения
 *
 * Задерживает обновление значения на указанное время.
 * Полезен для поисковых полей, autocomplete и других случаев,
 * когда нужно ограничить частоту запросов.
 *
 * @param value - Значение для debounce
 * @param delay - Задержка в миллисекундах (по умолчанию 300)
 * @returns Debounced значение
 *
 * @example
 * ```tsx
 * const [inputValue, setInputValue] = useState('')
 * const debouncedValue = useDebounce(inputValue, 300)
 *
 * useEffect(() => {
 *   // Выполняется только когда пользователь перестал печатать
 *   searchAPI(debouncedValue)
 * }, [debouncedValue])
 * ```
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
