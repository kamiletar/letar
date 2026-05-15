/**
 * useSystemVolume — управление системной громкостью устройства
 *
 * Использует TurboModule VolumeModule (AudioManager.STREAM_MUSIC).
 */

import { useCallback, useEffect, useState } from 'react'

import NativeVolumeModule from '../../specs/NativeVolumeModule'

export interface UseSystemVolumeReturn {
  /** Текущая громкость (0-1) */
  volume: number
  /** Установить громкость */
  setVolume: (value: number) => void
}

/**
 * Хук для управления системной громкостью (медиа)
 */
export function useSystemVolume(): UseSystemVolumeReturn {
  const [volume, setVolumeState] = useState(0.5)

  // Получаем текущую громкость при монтировании
  useEffect(() => {
    if (!NativeVolumeModule) {
      console.warn('[useSystemVolume] VolumeModule not available')
      return
    }
    NativeVolumeModule.getVolume()
      .then((level: number) => {
        setVolumeState(level)
      })
      .catch((err: Error) => {
        console.warn('[useSystemVolume] Не удалось получить громкость:', err.message)
      })
  }, [])

  const setVolume = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value))
    setVolumeState(clampedValue)

    if (!NativeVolumeModule) {
      return
    }
    NativeVolumeModule.setVolume(clampedValue).catch((err: Error) => {
      console.warn('[useSystemVolume] Не удалось установить громкость:', err.message)
    })
  }, [])

  return {
    volume,
    setVolume,
  }
}
