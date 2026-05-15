/**
 * useFullscreen — управление полноэкранным режимом
 *
 * Функции:
 * - Fullscreen API для погружения в просмотр
 * - Блокировка ориентации в landscape (если поддерживается)
 */

import { useCallback, useEffect, useState } from 'react'

interface UseFullscreenOptions {
  /** Элемент для fullscreen (по умолчанию document.documentElement) */
  element?: React.RefObject<HTMLElement | null>
  /** Блокировать ориентацию в landscape */
  lockOrientation?: boolean
  /** Callback при изменении fullscreen */
  onFullscreenChange?: (isFullscreen: boolean) => void
}

export function useFullscreen(options: UseFullscreenOptions = {}) {
  const { element, lockOrientation = true, onFullscreenChange } = options

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  // Проверка поддержки
  useEffect(() => {
    setIsSupported(
      typeof document.fullscreenEnabled !== 'undefined' ||
        typeof (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled !== 'undefined'
    )

    // Начальное состояние
    setIsFullscreen(!!document.fullscreenElement)
  }, [])

  // Слушаем изменения fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenActive = !!document.fullscreenElement
      setIsFullscreen(fullscreenActive)
      onFullscreenChange?.(fullscreenActive)

      // Блокировка ориентации при входе в fullscreen
      if (fullscreenActive && lockOrientation) {
        tryLockOrientation()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [lockOrientation, onFullscreenChange])

  // Попытка заблокировать ориентацию
  const tryLockOrientation = useCallback(async () => {
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await screen.orientation.lock('landscape')
      }
    } catch {
      // Игнорируем — не все браузеры поддерживают
      // Ориентация не поддерживается — игнорируем
    }
  }, [])

  // Попытка разблокировать ориентацию
  const tryUnlockOrientation = useCallback(() => {
    try {
      if (screen.orientation && 'unlock' in screen.orientation) {
        screen.orientation.unlock()
      }
    } catch {
      // Игнорируем
    }
  }, [])

  // Войти в fullscreen
  const enterFullscreen = useCallback(async () => {
    const target = element?.current ?? document.documentElement

    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen()
      } else if ((target as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (target as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
      }
    } catch {
      // Игнорируем — fullscreen может быть недоступен
    }
  }, [element])

  // Выйти из fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen()
      }

      if (lockOrientation) {
        tryUnlockOrientation()
      }
    } catch (err) {
      console.warn('[useFullscreen] Failed to exit fullscreen:', err)
    }
  }, [lockOrientation, tryUnlockOrientation])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  }
}
