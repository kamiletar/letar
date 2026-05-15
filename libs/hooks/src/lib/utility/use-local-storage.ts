'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Хук для работы с localStorage
 *
 * Синхронизирует состояние React с localStorage.
 * Поддерживает SSR (возвращает initialValue на сервере).
 *
 * @param key - Ключ в localStorage
 * @param initialValue - Начальное значение
 * @returns [value, setValue, removeValue] — текущее значение, setter и функция удаления
 *
 * @example
 * ```tsx
 * const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light')
 *
 * // Переключить тему
 * setTheme(theme === 'light' ? 'dark' : 'light')
 *
 * // Сбросить к дефолту
 * removeTheme()
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Получить начальное значение
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.warn(`Ошибка чтения localStorage ключа "${key}":`, error)
      return initialValue
    }
  }, [initialValue, key])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  // Синхронизация при монтировании (для SSR)
  useEffect(() => {
    setStoredValue(readValue())
  }, [readValue])

  // Setter
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
          // Dispatch event для синхронизации между вкладками
          window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }))
        }
      } catch (error) {
        console.warn(`Ошибка записи в localStorage ключа "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Удаление
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: null }))
      }
    } catch (error) {
      console.warn(`Ошибка удаления localStorage ключа "${key}":`, error)
    }
  }, [initialValue, key])

  // Слушать изменения в других вкладках
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T)
        } catch {
          setStoredValue(initialValue)
        }
      } else if (event.key === key && event.newValue === null) {
        setStoredValue(initialValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [initialValue, key])

  return [storedValue, setValue, removeValue]
}
