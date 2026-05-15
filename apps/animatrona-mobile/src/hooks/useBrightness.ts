/**
 * useBrightness — управление яркостью окна приложения
 *
 * Использует TurboModule BrightnessModule (WindowManager.LayoutParams.screenBrightness).
 * Меняет яркость только текущего окна (как VLC), не требует разрешений.
 * Яркость сбрасывается при выходе из приложения.
 */

import { useCallback, useEffect, useState } from 'react'

import NativeBrightnessModule from '../../specs/NativeBrightnessModule'

export interface UseBrightnessReturn {
  /** Текущая яркость (0-1) */
  brightness: number
  /** Установить яркость окна */
  setBrightness: (value: number) => void
  /** Восстановить системную яркость (-1 = авто) */
  restoreSystemBrightness: () => void
}

/**
 * Хук для управления яркостью окна приложения
 */
export function useBrightness(): UseBrightnessReturn {
  const [brightness, setBrightnessState] = useState(1)

  // Получаем текущую яркость окна при монтировании
  useEffect(() => {
    if (!NativeBrightnessModule) {
      console.warn('[useBrightness] BrightnessModule not available')
      return
    }
    NativeBrightnessModule.getBrightness()
      .then((level: number) => {
        setBrightnessState(level < 0 ? 1 : level)
      })
      .catch((err: Error) => {
        console.warn('[useBrightness] Не удалось получить яркость:', err.message)
      })
  }, [])

  const setBrightness = useCallback((value: number) => {
    const clampedValue = Math.max(0.01, Math.min(1, value))
    setBrightnessState(clampedValue)

    if (!NativeBrightnessModule) {
      return
    }
    NativeBrightnessModule.setBrightness(clampedValue).catch((err: Error) => {
      console.warn('[useBrightness] Не удалось установить яркость:', err.message)
    })
  }, [])

  const restoreSystemBrightness = useCallback(() => {
    setBrightnessState(1)

    if (!NativeBrightnessModule) {
      return
    }
    NativeBrightnessModule.restoreSystemBrightness().catch((err: Error) => {
      console.warn('[useBrightness] Не удалось восстановить яркость:', err.message)
    })
  }, [])

  return {
    brightness,
    setBrightness,
    restoreSystemBrightness,
  }
}
