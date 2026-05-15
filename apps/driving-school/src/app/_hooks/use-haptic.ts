'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Типы вибраций
 */
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning'

/**
 * Паттерны вибрации (в миллисекундах)
 * Для iOS используется одиночная вибрация, для Android — паттерны
 */
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10], // Двойная короткая вибрация
  error: [50, 100, 50], // Двойная длинная вибрация
  warning: [25, 50, 25, 50, 25], // Тройная средняя вибрация
}

/**
 * Хук для тактильной обратной связи (вибрации).
 *
 * Использует Vibration API для Android и стандартную вибрацию для iOS.
 * Автоматически определяет поддержку устройством.
 *
 * @returns Объект с функцией vibrate и флагом isSupported
 */
export function useHaptic() {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Проверяем поддержку Vibration API
    setIsSupported(typeof navigator !== 'undefined' && 'vibrate' in navigator)
  }, [])

  /**
   * Запускает вибрацию по заданному паттерну
   *
   * @param pattern - Тип вибрации или кастомный паттерн
   */
  const vibrate = useCallback(
    (pattern: HapticPattern | number | number[] = 'light') => {
      if (!isSupported) {
        return false
      }

      try {
        // Получаем паттерн вибрации
        const vibrationPattern = typeof pattern === 'string' ? PATTERNS[pattern] : pattern

        // Запускаем вибрацию
        return navigator.vibrate(vibrationPattern)
      } catch {
        // Некоторые браузеры могут выбросить ошибку
        return false
      }
    },
    [isSupported]
  )

  /**
   * Останавливает вибрацию
   */
  const stop = useCallback(() => {
    if (!isSupported) {
      return
    }
    navigator.vibrate(0)
  }, [isSupported])

  return {
    isSupported,
    vibrate,
    stop,
    // Удобные методы для часто используемых паттернов
    light: useCallback(() => vibrate('light'), [vibrate]),
    medium: useCallback(() => vibrate('medium'), [vibrate]),
    heavy: useCallback(() => vibrate('heavy'), [vibrate]),
    success: useCallback(() => vibrate('success'), [vibrate]),
    error: useCallback(() => vibrate('error'), [vibrate]),
    warning: useCallback(() => vibrate('warning'), [vibrate]),
  }
}
