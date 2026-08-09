'use client'

import { useEffect, useState } from 'react'

/**
 * Hook for debouncing a value
 *
 * Delays value update by the specified time.
 * Useful for search fields, autocomplete and other cases
 * when you need to limit request frequency.
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds (default 300)
 * @returns Debounced value
 *
 * @example
 * ```tsx
 * const [inputValue, setInputValue] = useState('')
 * const debouncedValue = useDebounce(inputValue, 300)
 *
 * useEffect(() => {
 *   // Executes only when user stops typing
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
