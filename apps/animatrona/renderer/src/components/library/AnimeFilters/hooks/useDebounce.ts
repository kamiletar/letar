import { useEffect, useState } from 'react'

/**
 * Хук для debounce значения
 *
 * @param value - Значение для debounce
 * @param delay - Задержка в миллисекундах (по умолчанию 250ms)
 * @returns Debounced значение
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 250)
 *
 * // debouncedSearch обновится через 250ms после последнего изменения search
 * useEffect(() => {
 *   fetchData(debouncedSearch)
 * }, [debouncedSearch])
 * ```
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Устанавливаем таймер для обновления debouncedValue
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Очищаем таймер при изменении value или delay
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
