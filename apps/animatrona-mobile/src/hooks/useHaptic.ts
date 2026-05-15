/**
 * Хук для тактильной обратной связи (haptic feedback)
 *
 * TODO: Установить react-native-haptic-feedback
 */

import { useCallback } from 'react'

/** Типы haptic feedback */
export type HapticType =
  | 'light' // Лёгкая вибрация
  | 'medium' // Средняя вибрация
  | 'heavy' // Сильная вибрация
  | 'selection' // Выбор элемента
  | 'success' // Успешное действие
  | 'warning' // Предупреждение
  | 'error' // Ошибка

export function useHaptic() {
  // Заглушка — haptic отключён
  const trigger = useCallback((_type: HapticType = 'light') => {
    // TODO: Реализовать через react-native-haptic-feedback
  }, [])

  const light = useCallback(() => undefined, [])
  const medium = useCallback(() => undefined, [])
  const selection = useCallback(() => undefined, [])
  const success = useCallback(() => undefined, [])

  return {
    trigger,
    light,
    medium,
    selection,
    success,
  }
}
