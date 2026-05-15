/**
 * useWakeLock — предотвращение засыпания экрана
 *
 * Использует FLAG_KEEP_SCREEN_ON через BrightnessModule (тот же модуль,
 * что управляет яркостью — оба работают через activity.window).
 */

import { useEffect } from 'react'

import NativeBrightnessModule from '../../specs/NativeBrightnessModule'

export interface UseWakeLockOptions {
  /** Включён ли wake lock */
  enabled?: boolean
}

/**
 * Хук для предотвращения засыпания экрана во время воспроизведения видео
 */
export function useWakeLock({ enabled = true }: UseWakeLockOptions = {}) {
  useEffect(() => {
    NativeBrightnessModule.setKeepScreenOn(enabled).catch((e) => {
      console.warn('[useWakeLock] setKeepScreenOn failed:', e)
    })
    return () => {
      NativeBrightnessModule.setKeepScreenOn(false).catch(() => undefined)
    }
  }, [enabled])
}
